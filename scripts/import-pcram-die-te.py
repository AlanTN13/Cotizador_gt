#!/usr/bin/env python3
"""Import PCRAM's public transfer into an isolated, immutable DIE/TE snapshot."""

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

SOURCE = "https://web.pcram.net/downloads/transf.zip"
PARSER_VERSION = "pcram-ncm-fixed-2134-v1"
EXPECTED = {"ncm.txt", "sufidos.txt", "regvalor.txt", "codafip.txt"}
MAX_ZIP_BYTES = 30_000_000
MAX_UNCOMPRESSED_BYTES = 150_000_000
NCM_WIDTH = 2134
SIM_PATTERN = re.compile(r"\d{4}\.\d{2}\.\d{2}\d{3}[A-Z]")
RATE_PATTERN = re.compile(r"\d{1,2}\.\d{2}")


def field(record, start, end):
    """Extract a one-based inclusive byte range from PCRAM's ASCII SDF record."""
    return record[start - 1:end].decode("latin-1").strip()


def parse_rate(value):
    if not RATE_PATTERN.fullmatch(value):
        return None
    rate = float(value)
    return rate if 0 <= rate <= 100 else None


def parse_record(record):
    if len(record) != NCM_WIDTH:
        raise ValueError(f"NCM record width changed: {len(record)}")
    sim_punctuated = field(record, 1, 14)
    if not SIM_PATTERN.fullmatch(sim_punctuated):
        raise ValueError(f"NCM/SIM structure changed: {sim_punctuated!r}")
    raw_date = field(record, 2089, 2094)
    try:
        updated_at = datetime.strptime(raw_date, "%d%m%y").date().isoformat()
    except ValueError as exc:
        raise ValueError(f"NCM date structure changed: {raw_date!r}") from exc
    die = parse_rate(field(record, 1798, 1802))
    te = parse_rate(field(record, 1803, 1807))
    aec = parse_rate(field(record, 1858, 1862))
    if die is None or te is None:
        return None, sim_punctuated.replace(".", ""), "invalid_die_or_te"
    if aec is None:
        return None, sim_punctuated.replace(".", ""), "invalid_aec"
    temporary_reduction = field(record, 1808, 1812)
    if temporary_reduction and parse_rate(temporary_reduction) is None:
        return None, sim_punctuated.replace(".", ""), "invalid_temporary_reduction"
    return {
        "sim": sim_punctuated.replace(".", ""),
        "description": " ".join((field(record, 1539, 1792) or field(record, 15, 1538)).split()),
        "die_extrazona_pct": die,
        "tasa_estadistica_pct": te,
        "aec_pct": aec,
        "updated_at": updated_at,
        "flags": {
            "estadistica_exencion": field(record, 2072, 2072),
            "die_reduccion_temporal_pct": parse_rate(temporary_reduction) if temporary_reduction else None,
            "norma_die": field(record, 1868, 1885),
            "norma_estadistica": field(record, 1886, 1903),
        },
    }, None, None


def build_dataset(zip_bytes, downloaded_at):
    if not zip_bytes or len(zip_bytes) > MAX_ZIP_BYTES:
        raise ValueError("ZIP empty or larger than allowed")
    digest = hashlib.sha256(zip_bytes).hexdigest()
    try:
        archive = zipfile.ZipFile(io.BytesIO(zip_bytes))
        infos = archive.infolist()
        names = [info.filename.lower() for info in infos]
        if len(names) != len(EXPECTED) or set(names) != EXPECTED or any("/" in name for name in names):
            raise ValueError(f"Unexpected ZIP members: {names}")
        if sum(info.file_size for info in infos) > MAX_UNCOMPRESSED_BYTES:
            raise ValueError("ZIP uncompressed size larger than allowed")
        if archive.testzip() is not None:
            raise ValueError("ZIP CRC check failed")
        ncm_name = infos[names.index("ncm.txt")].filename
        raw = archive.read(ncm_name)
    except (zipfile.BadZipFile, RuntimeError, EOFError) as exc:
        raise ValueError("ZIP corrupt") from exc
    if not raw or not raw.endswith(b"\r\n"):
        raise ValueError("NCM empty or line framing changed")
    lines = raw.split(b"\r\n")[:-1]
    if not lines:
        raise ValueError("NCM has no records")
    records = {}
    rejected = []
    for line_number, line in enumerate(lines, 1):
        row, sim, reason = parse_record(line)
        if row is None:
            rejected.append({"line": line_number, "sim": sim, "reason": reason})
            continue
        if row["sim"] in records:
            raise ValueError(f"Duplicate SIM: {row['sim']}")
        records[row["sim"]] = row
    if not records:
        raise ValueError("No valid DIE/TE records")
    return {
        "metadata": {
            "source": SOURCE,
            "downloaded_at": downloaded_at,
            "zip_sha256": digest,
            "parser_version": PARSER_VERSION,
            "record_count": len(lines),
            "accepted_count": len(records),
            "rejected_count": len(rejected),
            "files": sorted(names),
            "scope": "DIE_TE_ONLY; IVA excluded",
        },
        "records": records,
        "rejected": rejected,
    }


def save_dataset(dataset, output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{dataset['metadata']['zip_sha256']}.json"
    if destination.exists():
        existing = json.loads(destination.read_text(encoding="utf-8"))
        if existing["metadata"]["zip_sha256"] != dataset["metadata"]["zip_sha256"]:
            raise ValueError("Versioned dataset filename collision")
        return destination
    payload = json.dumps(dataset, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output_dir, delete=False) as temp:
        temp.write(payload)
        temporary_path = Path(temp.name)
    try:
        os.replace(temporary_path, destination)
    finally:
        temporary_path.unlink(missing_ok=True)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, help="Use a previously downloaded ZIP for reproducible testing")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parents[1] / "data/pcram-die-te")
    args = parser.parse_args()
    if args.zip:
        zip_bytes = args.zip.read_bytes()
    else:
        result = subprocess.run(
            ["curl", "--fail", "--location", "--silent", "--show-error", "--proto", "=https",
             "--max-time", "45", "--max-filesize", str(MAX_ZIP_BYTES), SOURCE],
            capture_output=True,
            check=True,
        )
        zip_bytes = result.stdout
    dataset = build_dataset(zip_bytes, datetime.now(timezone.utc).isoformat())
    destination = save_dataset(dataset, args.output_dir)
    print(json.dumps({"dataset": str(destination), "metadata": dataset["metadata"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Derive a read-only classification index; never write the tax dataset."""
import argparse
import hashlib
import importlib.util
import json
import os
import tempfile
import zipfile
import io
import base64
import re
import unicodedata
import zlib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pcram_importer", ROOT / "scripts/import-pcram-die-te.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)
VERSION = "pcram-nomenclator-fixed-2134-v1"


def build_index(zip_bytes, tax_source_sha256):
    # Reuse CRC, file list, framing, width, code and date validation.
    validated = importer.build_dataset(zip_bytes, "not-applicable-derived-index")
    digest = validated["metadata"]["zip_sha256"]
    if len(tax_source_sha256) != 64 or any(c not in "0123456789abcdef" for c in tax_source_sha256):
        raise ValueError("Invalid tax snapshot SHA-256 reference")
    z = zipfile.ZipFile(io.BytesIO(zip_bytes))
    raw = z.read(next(n for n in z.namelist() if n.lower() == "ncm.txt"))
    ncms, sims, seen = {}, [], set()
    for line in raw.split(b"\r\n")[:-1]:
        sim = importer.field(line, 1, 14).replace(".", "")
        if sim in seen:
            raise ValueError("Duplicate position in nomenclator")
        seen.add(sim)
        ncm = sim[:8]  # Structural NCM field from source, not repairing an agent code.
        # The six 254-byte fields continue text across word boundaries. Do NOT
        # assign artificial HS headings or insert spaces between those chunks.
        context = " ".join(importer.field(line, 15, 1538).split())
        description = " ".join(importer.field(line, 1539, 1792).split())
        if not context:
            raise ValueError(f"Missing NCM context: {ncm}")
        ncm_value = [context, line[1537:1538] != b" "]
        if ncm in ncms and ncms[ncm] != ncm_value:
            raise ValueError(f"Conflicting NCM context: {ncm}")
        ncms[ncm] = ncm_value
        updated = importer.datetime.strptime(importer.field(line, 2089, 2094), "%d%m%y").date().isoformat()
        # Full field is only a possible truncation signal, not proof of completeness.
        sims.append([sim, description, updated, line[1791:1792] != b" "])
    return {
        "metadata": {
            "schema": VERSION,
            "source": importer.SOURCE,
            "structure_source": "https://www.pcram.net/downloads/estructura.html",
            "zip_sha256": digest,
            "ncm_sha256": hashlib.sha256(raw).hexdigest(),
            "importer_version": importer.PARSER_VERSION,
            "record_count": len(sims),
            "ncm_count": len(ncms),
            "tax_snapshot_sha256": tax_source_sha256,
            "source_matches_tax_snapshot": digest == tax_source_sha256,
            "purpose": "CLASSIFICATION_ONLY; no rates; no legal notes",
            "fields": {"ncm": [1, 10], "sim": [11, 14], "ncm_context": [15, 1538], "sim_description": [1539, 1792], "updated_at": [2089, 2094]},
            "limitations": [
                "Context is concatenated source text, not structured legal notes or independently coded ancestor headings.",
                "Descriptions may be truncated; do not complete them or assume absent attributes.",
                "Code existence does not establish compatibility with the product.",
                "Tax Resolver keeps its own frozen source and precedences; this index supplies no rates.",
            ],
        },
        "ncms": dict(sorted(ncms.items())),
        "sims": sorted(sims),
    }


def encode(index):
    return (json.dumps(index, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def build_query_package(index):
    """Build all lookup indexes once; pack literal source text in lazy HS4 blocks."""
    groups = defaultdict(list)
    for row in index["sims"]:
        groups[row[0][:8]].append(row)
    codes = sorted(groups)
    prefixes, shards = {}, defaultdict(list)
    context_words, sim_words = defaultdict(set), defaultdict(set)
    sim_offsets, sim_offset = [], 0
    def words(text):
        folded = "".join(c for c in unicodedata.normalize("NFD", text)
                         if not "\u0300" <= c <= "\u036f").lower()
        return {word for word in re.findall(r"[a-z0-9]+", folded) if len(word) >= 3}
    for ident, code in enumerate(codes):
        for width in (4, 6, 8):
            prefix = code[:width]
            if prefix not in prefixes:
                prefixes[prefix] = [ident, ident + 1]
            else:
                prefixes[prefix][1] = ident + 1
        context, full = index["ncms"][code]
        rows = groups[code]
        shards[code[:4]].append([context, full, rows])
        sim_offsets.append(sim_offset)
        for word in words(context):
            context_words[word].add(ident)
        for offset, row in enumerate(rows):
            for word in words(row[1]):
                sim_words[word].add(sim_offset + offset)
        sim_offset += len(rows)
    sim_offsets.append(sim_offset)
    vocabulary = sorted(context_words.keys() | sim_words.keys())
    grams = defaultdict(set)
    for ident, word in enumerate(vocabulary):
        for offset in range(len(word) - 2):
            grams[word[offset:offset + 3]].add(ident)

    def posting(ids):
        data, previous = bytearray(), 0
        for ident in sorted(ids):
            delta = ident - previous
            while delta >= 128:
                data.append((delta & 127) | 128)
                delta >>= 7
            data.append(delta)
            previous = ident
        return base64.b64encode(data).decode("ascii")

    def block(value):
        # ASCII JSON permits a tiny, portable decoder without Buffer/TextDecoder.
        raw = json.dumps(value, ensure_ascii=True, separators=(",", ":")).encode("ascii")
        compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
        compressed = compressor.compress(raw) + compressor.flush()
        return [len(raw), zlib.adler32(raw), base64.b64encode(compressed).decode("ascii")]

    return {
        "format": "pcram-query-prefix-word-deflate-v3",
        "metadata": index["metadata"],  # Same source/response metadata; no tax changes.
        "catalog": block({"codes": codes, "prefixes": prefixes, "sim_offsets": sim_offsets}),
        "terms": block({"words": [[word, posting(context_words[word]), posting(sim_words[word])] for word in vocabulary],
                        "grams": {gram: posting(ids) for gram, ids in sorted(grams.items())}}),
        "shards": {key: block(rows) for key, rows in sorted(shards.items())},
        "index_counts": {"prefixes": len(prefixes), "trigrams": len(grams), "words": len(vocabulary),
                         "postings": sum(map(len, grams.values())), "shards": len(shards)},
    }


def save(index, output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    suffix = ".indexed-v3" if "format" in index else ""
    dest = output_dir / f"{index['metadata']['zip_sha256']}{suffix}.json"
    payload = encode(index)
    if dest.exists():
        if dest.read_bytes() != payload:
            raise ValueError("Immutable index collision; previous valid file preserved")
        return dest
    with tempfile.NamedTemporaryFile(dir=output_dir, delete=False) as f:
        f.write(payload)
        temp = Path(f.name)
    try:
        os.replace(temp, dest)
    finally:
        temp.unlink(missing_ok=True)
    return dest


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--zip", required=True, type=Path, help="Pinned transfer downloaded once at preparation time")
    ap.add_argument("--tax-source-sha256", required=True, help="Frozen tax source reference; no rates read or written")
    ap.add_argument("--output-dir", type=Path, default=ROOT / "data/pcram-nomenclator")
    ap.add_argument("--optimized", action="store_true", help="Precompute prefix/trigram indexes and lazy compressed blocks")
    args = ap.parse_args()
    result = build_index(args.zip.read_bytes(), args.tax_source_sha256)
    if args.optimized:
        result = build_query_package(result)
    dest = save(result, args.output_dir)
    print(json.dumps({"index": str(dest), "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(), "metadata": result["metadata"]}, ensure_ascii=False))

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import base64
import zlib
import zipfile

spec = importlib.util.spec_from_file_location("builder", Path(__file__).resolve().parents[1] / "scripts/build-pcram-nomenclator.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def row(code="6109.90.00111N", context="Camisetas de punto. Prendas de vestir de punto.", description="De fibras sintéticas."):
    record = bytearray(b" " * 2134)
    for start, end, value in [(1, 14, code), (15, 1538, context), (1539, 1792, description),
                             (1798, 1802, "20.00"), (1803, 1807, " 3.00"), (1858, 1862, "20.00"), (2089, 2094, "081026")]:
        record[start - 1:end] = value.encode("latin1").ljust(end - start + 1)
    return bytes(record)


def archive(records, omit=None):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as z:
        for name in builder.importer.EXPECTED:
            if name != omit: z.writestr(name, b"\r\n".join(records) + b"\r\n" if name == "ncm.txt" else b"\r\n")
    return output.getvalue()


class NomenclatorTests(unittest.TestCase):
    def test_ranges_keep_context_and_truncated_sim_without_filling(self):
        context = "a" * 253 + "palabra" + " contexto jerárquico"
        desc = "z" * 254
        index = builder.build_index(archive([row(context=context, description=desc)]), "0" * 64)
        self.assertEqual(index["ncms"]["61099000"][0], context)
        self.assertEqual(index["sims"][0][1], desc)
        self.assertTrue(index["sims"][0][3])
        self.assertEqual(index["sims"][0][2], "2026-10-08")
        self.assertNotIn("die_extrazona_pct", json.dumps(index))
        self.assertNotIn("aec_pct", json.dumps(index))

    def test_deterministic_linked_source(self):
        raw = archive([row()]); sha = hashlib.sha256(raw).hexdigest()
        first = builder.build_index(raw, sha)
        self.assertTrue(first["metadata"]["source_matches_tax_snapshot"])
        self.assertEqual(builder.encode(first), builder.encode(builder.build_index(raw, sha)))

    def test_duplicate_and_conflicting_context_are_rejected(self):
        for records in [[row(), row()], [row(), row("6109.90.00112X", context="Otro contexto")]]:
            with self.assertRaises(ValueError): builder.build_index(archive(records), "0" * 64)

    def test_corrupt_missing_file_and_changed_width_rejected(self):
        for raw in [b"", b"broken", archive([row()], "sufidos.txt"), archive([row()[:-1]])]:
            with self.assertRaises(ValueError): builder.build_index(raw, "0" * 64)

    def test_failed_collision_preserves_valid_version(self):
        index = builder.build_index(archive([row()]), "0" * 64)
        with tempfile.TemporaryDirectory() as d:
            dest = builder.save(index, d); old = dest.read_bytes()
            index["sims"][0][1] = "Altered"
            with self.assertRaises(ValueError): builder.save(index, d)
            self.assertEqual(dest.read_bytes(), old)

    def test_packed_reproducible_and_lossless_actual_transfer(self):
        root = Path(__file__).resolve().parents[1]
        source = root / "data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.json"
        index = json.loads(source.read_text())
        packed = builder.build_query_package(index)
        self.assertEqual(builder.encode(packed), source.with_suffix(".indexed-v3.json").read_bytes())
        def unpack(block):
            size, checksum, b64 = block
            raw = zlib.decompress(base64.b64decode(b64), -15)
            self.assertEqual(len(raw), size)
            self.assertEqual(zlib.adler32(raw), checksum)
            return json.loads(raw)
        catalog = unpack(packed["catalog"])
        reconstructed, contexts = [], {}
        for hs4, block in packed["shards"].items():
            start, end = catalog["prefixes"][hs4]
            rows = unpack(block)
            self.assertEqual(len(rows), end - start)
            for ncm, (context, flag, sims) in zip(catalog["codes"][start:end], rows):
                contexts[ncm] = [context, flag]; reconstructed.extend(sims)
        self.assertEqual(contexts, index["ncms"])
        self.assertEqual(reconstructed, index["sims"])
        self.assertEqual(packed["metadata"], index["metadata"])

    def test_optimized_prefix_ranges_generated_not_hand_maintained(self):
        index = builder.build_index(archive([row(), row("9503.00.60912G", context="Juguetes de plástico")]), "0" * 64)
        packed = builder.build_query_package(index)
        catalog = json.loads(zlib.decompress(base64.b64decode(packed["catalog"][2]), -15))
        self.assertEqual(catalog["prefixes"]["6109"], [0, 1])
        self.assertEqual(catalog["prefixes"]["95030060"], [1, 2])
        self.assertIn("pla", json.loads(zlib.decompress(base64.b64decode(packed["terms"][2]), -15))["grams"])

    def test_optimized_filename_preserves_old_valid_version(self):
        index = builder.build_index(archive([row()]), "0" * 64)
        with tempfile.TemporaryDirectory() as d:
            old = builder.save(index, d); old_bytes = old.read_bytes()
            new = builder.save(builder.build_query_package(index), d)
            self.assertNotEqual(old, new)
            self.assertEqual(old.read_bytes(), old_bytes)


if __name__ == "__main__": unittest.main()

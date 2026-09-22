"""Offline import for Germán's supplied snapshot. Never executed at quote time.
Requires pypdf==6.10.0. Unknown PDF versions/layouts fail instead of guessing columns.
Usage: python scripts/import-ncmsim.py [path/to/ncmsim.pdf]
"""
import hashlib
import json
import re
import sys
from decimal import Decimal
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data/tax-sources/ncmsim.pdf'
EXPECTED_HASH = '38cbf471b591f88f414958a6589c11b783c130e8af6357e56d5e02a66120bf8d'

def extract(source):
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != EXPECTED_HASH:
        raise ValueError('Unreviewed source: review layout, count and metadata before updating importer')
    pdf = PdfReader(source)
    assert len(pdf.pages) == 1629
    rows = {}
    # Anchored right edge: AEC, DIE, TE, empty SIMI, RE, DE. Descriptions
    # may contain decimal-looking NCM codes; never pick their first numbers.
    pattern = re.compile(r"^'(\d{11}[A-Z])\s+.*?\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s*$")
    for page, obj in enumerate(pdf.pages, 1):
        text = obj.extract_text(extraction_mode='layout')
        for line in text.splitlines():
            if not re.match(r"^'\d{11}[A-Z]\b", line):
                continue
            match = pattern.fullmatch(line)
            if not match:
                raise ValueError(f'Unparseable SIM row on page {page}: {line}')
            sim, aec, die, te, re_, de = match.groups()
            if sim in rows:
                raise ValueError(f'Duplicate SIM {sim}')
            duty, statistical = float(Decimal(die) / 100), float(Decimal(te) / 100)
            assert 0 <= duty <= 1 and 0 <= statistical <= 1
            rows[sim] = {'duty': duty, 'statistical': statistical, 'page': page}
    assert len(rows) == 32978, len(rows)
    assert sum(r['statistical'] == 0 for r in rows.values()) == 3337
    return {
        'version': 'german-ncmsim-38cbf471b591-v1',
        'source': {
            'id': 'german-ncmsim', 'document': 'data/tax-sources/ncmsim.pdf',
            'sha256': digest, 'capturedAt': '2026-09-22T00:00:00Z',
            'reviewAfter': '2026-10-22T00:00:00Z', 'effectiveDate': None,
            'note': 'Snapshot aportado por Germán; fecha de vigencia normativa no certificada. ReviewAfter es un gate técnico de mantenimiento, no vigencia legal.'
        },
        'rowCount': len(rows), 'rows': rows
    }

if __name__ == '__main__':
    result = extract(SOURCE)
    target = ROOT / 'data/tax-die-te.json'
    # One entry per line keeps diffs reviewable without a 200k-line JSON file.
    header = json.dumps({k:v for k,v in result.items() if k != 'rows'}, ensure_ascii=False, indent=2)
    target.write_text(header[:-2] + ',\n  "rows": {\n' + ',\n'.join(
        '    ' + json.dumps(k) + ': ' + json.dumps(v, ensure_ascii=False)
        for k,v in result['rows'].items()) + '\n  }\n}\n')
    print(f'{len(result["rows"])} unique SIM rows; 3337 zero TE; source SHA-256 verified')

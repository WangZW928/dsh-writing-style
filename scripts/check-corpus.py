#!/usr/bin/env python3
"""Verify the explicitly imported corpus without printing document contents."""
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'corpus/manifest.json').read_text())
package = json.loads((ROOT / 'package.json').read_text())
errors = []
if package.get('private') is not True:
    errors.append('package.json must remain private for this prototype')
if manifest.get('visibility') != 'private':
    errors.append('corpus visibility marker must remain private')
records = manifest.get('records', [])
if {r.get('id') for r in records} != {'A', 'B', 'C', 'D', 'E'} or len(records) != 5:
    errors.append('expected exactly the five declared source records')
for record in records:
    relative = Path(record['path'])
    target = (ROOT / relative).resolve()
    allowed = (ROOT / 'corpus/originals').resolve()
    if relative.is_absolute() or not target.is_relative_to(allowed):
        errors.append(f"source path is outside corpus/originals: {record.get('id')}")
        continue
    if not target.is_file():
        errors.append(f"source missing: {record.get('id')}")
        continue
    data = target.read_bytes()
    if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
        errors.append(f"source integrity mismatch: {record.get('id')}")
    if target.suffix == '.zip':
        with zipfile.ZipFile(target) as archive:
            if archive.testzip() is not None:
                errors.append(f"source archive CRC mismatch: {record.get('id')}")
for item in manifest.get('pendingWebSources', []):
    if item.get('status') != 'not-read':
        errors.append('unretrieved blog must remain not-read')
for document in list((ROOT / 'analysis').glob('*.md')) + [ROOT / 'corpus/derived/gmres/数值开发文档_风格证据.md']:
    text = document.read_text()
    for destination in re.findall(r'\]\(<([^>]+)>\)', text):
        filename, _, fragment = destination.partition('#')
        if filename.startswith(('http:', 'https:')):
            continue
        if Path(filename).is_absolute():
            errors.append(f'nonportable absolute source link in {document.name}')
            continue
        source = (document.parent / filename).resolve()
        if not source.is_relative_to(ROOT) or not source.is_file():
            errors.append(f'broken or outside source link in {document.name}')
        elif fragment.startswith('L'):
            count = len(source.read_text().splitlines())
            if any(not 0 < int(n) <= count for n in re.findall(r'L(\d+)', fragment)):
                errors.append(f'line citation outside source in {document.name}')
if errors:
    for error in errors:
        print(error, file=sys.stderr)
    raise SystemExit(1)
print('Five source records verified; original archive checksums and portable analysis links valid.')
print('Blogs remain excluded from style evidence. Corpus checks do not certify source claims or credentials.')

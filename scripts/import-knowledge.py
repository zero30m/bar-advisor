#!/usr/bin/env python3
"""Extract plain text from a user-provided DOCX; never execute document contents."""
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

source = Path(sys.argv[1])
with zipfile.ZipFile(source) as archive:
    root = ElementTree.fromstring(archive.read('word/document.xml'))
namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraphs = [''.join(t.text or '' for t in p.findall('.//w:t', namespace))
              for p in root.findall('.//w:p', namespace)]
target = Path(__file__).resolve().parent.parent / 'private' / 'knowledge.txt'
target.parent.mkdir(exist_ok=True)
target.write_text('\n'.join(p for p in paragraphs if p.strip()), encoding='utf-8')
print('Imported reference text. Restart server to reload.')

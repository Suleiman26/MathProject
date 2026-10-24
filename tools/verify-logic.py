#!/usr/bin/env python3
"""Prove that the math and the text were not touched.

Compares every topic's code (all the math, all the Hebrew text the student
sees) in the Next.js app with the saved HTML version, byte for byte:

  src/topics/<slug>/Topic.jsx   (between BEGIN ORIGINAL / END ORIGINAL)
        must equal
  <slug>.html  at git tag html-v1  (its <script type="text/babel"> block,
                                    minus the one ReactDOM render line)

It also checks that the classic copy (public/classic) still matches html-v1,
and that every text from the original home page is still on the new one.

Usage:
    python3 tools/verify-logic.py            # compare with html-v1
    python3 tools/verify-logic.py <git-ref>  # compare with another commit/tag

Exit code 0 = identical, 1 = something differs.
"""
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BABEL = re.compile(r'<script type="text/babel"[^>]*>([\s\S]*?)</script>')
RENDER = re.compile(r"^ReactDOM\.createRoot\(document\.getElementById\('root'\)\)\.render\(<App ?/>\);[ \t]*$", re.M)
MIDDLE = re.compile(r"// ===== BEGIN ORIGINAL =====\n([\s\S]*)// ===== END ORIGINAL =====\n")
# lines in the new home page / topic list where the original home texts must appear
HOME_SOURCES = ["app/layout.tsx", "app/page.tsx", "src/home/catalog.js", "src/home/Home.jsx"]


def git_show(ref, name):
    r = subprocess.run(["git", "show", f"{ref}:{name}"], cwd=ROOT, capture_output=True)
    return r.stdout.decode("utf-8") if r.returncode == 0 else None


class Texts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip, self.out = 0, []

    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script", "svg"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("style", "script", "svg"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.out.append(" ".join(data.split()))


def main(argv):
    ref = argv[1] if len(argv) > 1 else "html-v1"
    files = subprocess.run(["git", "ls-tree", "--name-only", ref], cwd=ROOT, capture_output=True, text=True).stdout.split()
    pages = [f for f in files if f.endswith(".html")]
    bad = 0
    print(f"Comparing with {ref}\n")
    print(f"{'topic':24} {'Next.js code':14} {'classic copy':12}")
    for name in pages:
        old = git_show(ref, name)
        old_blocks = BABEL.findall(old)
        classic = ROOT / "public" / "classic" / name
        classic_ok = classic.exists() and BABEL.findall(classic.read_text(encoding="utf-8")) == old_blocks
        if not old_blocks:
            print(f"{name:24} {'(no code)':14} {'same' if classic_ok or not classic.exists() else 'CHANGED':12}")
            continue
        expected = RENDER.sub("", old_blocks[0], count=1)
        topic = ROOT / "src" / "topics" / name[:-5] / "Topic.jsx"
        m = MIDDLE.search(topic.read_text(encoding="utf-8")) if topic.exists() else None
        next_ok = bool(m) and m.group(1) == expected
        print(f"{name:24} {'same' if next_ok else 'CHANGED':14} {'same' if classic_ok else 'CHANGED':12}")
        bad += (not next_ok) + (not classic_ok)

    # every text of the original home page must still be on the new home page
    p = Texts()
    p.feed(git_show(ref, "index.html") or "")
    src = "".join((ROOT / f).read_text(encoding="utf-8") for f in HOME_SOURCES if (ROOT / f).exists())
    missing = [t for t in p.out if t not in src]
    print(f"\nhome page: {len(p.out) - len(missing)}/{len(p.out)} original texts present" + (f"  MISSING: {missing}" if missing else ""))
    bad += bool(missing)

    print("\nRESULT:", "math and text untouched" if not bad else f"{bad} difference(s) found")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

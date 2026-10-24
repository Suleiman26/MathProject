#!/usr/bin/env python3
"""Prove that the math and the text were not touched.

Compares every page's <script type="text/babel"> block (all the math, all the
Hebrew text the student sees) against a git reference, byte for byte.
Also checks the page <title> and the home page's link texts.

Usage:
    python3 tools/verify-logic.py              # compare with origin/main
    python3 tools/verify-logic.py a73b3ed      # compare with any commit

Exit code 0 = everything identical, 1 = something differs.
"""
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BABEL_BLOCK = re.compile(r'<script type="text/babel"[^>]*>([\s\S]*?)</script>')
TITLE = re.compile(r"<title>([\s\S]*?)</title>")


def git_show(ref, name):
    r = subprocess.run(["git", "show", f"{ref}:{name}"], cwd=ROOT, capture_output=True)
    return r.stdout.decode("utf-8") if r.returncode == 0 else None


class Texts(HTMLParser):
    """All visible text pieces, in order (skips <style>/<script>/<svg>)."""
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script", "svg"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("style", "script", "svg"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.out.append(" ".join(data.split()))


def texts(html):
    p = Texts()
    p.feed(html)
    return p.out


def is_subsequence(small, big):
    it = iter(big)
    return all(any(s == b for b in it) for s in small)


def main(argv):
    ref = argv[1] if len(argv) > 1 else "origin/main"
    names = subprocess.run(["git", "ls-tree", "--name-only", ref], cwd=ROOT,
                           capture_output=True, text=True).stdout.split()
    pages = [n for n in names if n.endswith(".html")]
    bad = 0
    print(f"Comparing with {ref}\n")
    print(f"{'page':28} {'logic+text':12} {'title':6}")
    for name in pages:
        old, new = git_show(ref, name), (ROOT / name).read_text(encoding="utf-8")
        logic_ok = BABEL_BLOCK.findall(old) == BABEL_BLOCK.findall(new)
        title_ok = TITLE.findall(old) == TITLE.findall(new)
        has_logic = bool(BABEL_BLOCK.findall(old))
        logic_col = ("same" if logic_ok else "CHANGED") if has_logic else "(no code)"
        print(f"{name:28} {logic_col:12} {'same' if title_ok else 'CHANGED':6}")
        bad += (not logic_ok) + (not title_ok)

    # the home page has no code: check every original text piece is still there, in order
    if "index.html" in pages:
        old_t = texts(git_show(ref, "index.html"))
        new_t = texts((ROOT / "index.html").read_text(encoding="utf-8"))
        ok = is_subsequence(old_t, new_t)
        print(f"\nindex.html: all {len(old_t)} original texts present, same order: {'yes' if ok else 'NO'}")
        bad += not ok

    print("\nRESULT:", "math and text untouched" if not bad else f"{bad} difference(s) found")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

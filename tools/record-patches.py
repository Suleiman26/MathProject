#!/usr/bin/env python3
"""Record the changes made to a topic's original code as display patches.

After an approved change to src/topics/<slug>/Topic.jsx (between BEGIN/END
ORIGINAL), run:

    python3 tools/record-patches.py <slug> "why this change was made"

It compares the topic with the html-v1 original (plus the patches already
listed in tools/display-patches.json), turns each new difference into an
old -> new patch with enough context to be unique, and appends them. Then
tools/verify-logic.py shows "+N display" for the topic instead of CHANGED.
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PFILE = ROOT / "tools" / "display-patches.json"
BABEL = re.compile(r'<script type="text/babel"[^>]*>([\s\S]*?)</script>')
RENDER = re.compile(r"^ReactDOM\.createRoot\(document\.getElementById\('root'\)\)\.render\(<App ?/>\);[ \t]*$", re.M)
MIDDLE = re.compile(r"// ===== BEGIN ORIGINAL =====\n([\s\S]*)// ===== END ORIGINAL =====\n")


def main(slug, why):
    old_html = subprocess.run(["git", "show", f"html-v1:{slug}.html"], cwd=ROOT, capture_output=True).stdout.decode()
    base = RENDER.sub("", BABEL.findall(old_html)[0], count=1)
    patches = json.loads(PFILE.read_text(encoding="utf-8"))
    for pt in patches.get(slug, []):
        base = base.replace(pt["old"], pt["new"])
    now = MIDDLE.search((ROOT / "src" / "topics" / slug / "Topic.jsx").read_text(encoding="utf-8")).group(1)
    if now == base:
        print("no new changes")
        return
    a, b = base.splitlines(keepends=True), now.splitlines(keepends=True)
    # changed regions, top to bottom; regions closer than 3 lines are merged
    hunks = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        if hunks and i1 - hunks[-1][1] < 3:
            h = hunks[-1]
            hunks[-1] = [h[0], i2, h[2], j2]
        else:
            hunks.append([i1, i2, j1, j2])
    new = []
    work = base
    prev_end = 0
    for k, (i1, i2, j1, j2) in enumerate(hunks):
        next_start = hunks[k + 1][0] if k + 1 < len(hunks) else len(a)
        lo, hi = i1, i2
        # grow context (only into untouched lines) until the old text occurs once in the text as it is then
        while True:
            old = "".join(a[lo:hi])
            if old and work.count(old) == 1:
                break
            if hi < next_start:
                hi += 1
            elif lo > prev_end:
                lo -= 1
            else:
                sys.exit(f"could not make change near line {i1 + 1} unique; nothing written")
        new_txt = "".join(a[lo:i1]) + "".join(b[j1:j2]) + "".join(a[i2:hi])
        work = work.replace(old, new_txt)
        new.append({"why": why, "old": old, "new": new_txt, "count": 1})
        prev_end = hi
    if work != now:
        sys.exit("could not express the change as unique patches; nothing written")
    patches.setdefault(slug, []).extend(new)
    PFILE.write_text(json.dumps(patches, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"recorded {len(new)} patch(es) for {slug}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])

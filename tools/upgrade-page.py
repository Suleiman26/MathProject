#!/usr/bin/env python3
"""Plug an exercise page into the MathProject design system.

Usage:
    python3 tools/upgrade-page.py triangles.html sky
    python3 tools/upgrade-page.py --all          # every page in TOPICS below

What it changes (and only this):
  * <html data-topic="...">            -> the page's accent colour
  * fonts, icon, theme colour           -> added inside <head>
  * the page's own <style>              -> wrapped in "@layer legacy { ... }"
                                           (same rules, they just stop fighting
                                           the design system)
  * assets/mp.css + assets/mp.js        -> linked
  * React / Babel script links          -> pinned to exact versions
  * <div id="root">                     -> gets a small loading spinner

It NEVER touches the <script type="text/babel"> block (the math and the text).
Run tools/verify-logic.py afterwards to prove it.
Safe to run twice: pages already upgraded are skipped.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSET_VERSION = "1"

# Each page keeps the colour family it was built with, so colours the math
# code sets inline (graphs, highlights) still match the page.
TOPICS = {
    "equation-solver.html": "teal",
    "equations-advanced.html": "indigo",
    "inequalities.html": "pink",
    "quadratic-solver.html": "blue",
    "linear-function.html": "teal",
    "parabola-practice.html": "indigo",
    "intersection.html": "blue",
    "directed-numbers.html": "teal",
    "ratio-percent.html": "teal",
    "powers-roots.html": "violet",
    "angles-parallel.html": "teal",
    "triangles.html": "sky",
    "quadrilaterals.html": "cyan",
    "pythagoras.html": "indigo",
    "similar-triangles.html": "orange",
    "circle.html": "sky",
    "solids3d.html": "teal",
}

REACT = "https://unpkg.com/react@18.3.1/umd/react.production.min.js"
REACT_DOM = "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"
BABEL = "https://unpkg.com/@babel/standalone@8.0.7/babel.min.js"

HEAD_ADDITIONS = """<meta name="theme-color" content="#f5f5f2">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap">
"""

SHELL = f"""<link rel="stylesheet" href="assets/mp.css?v={ASSET_VERSION}">
<style id="mp-page">
@layer page {{
}}
</style>
<script src="assets/mp.js?v={ASSET_VERSION}" defer></script>
"""

BABEL_BLOCK = re.compile(r'<script type="text/babel"[^>]*>[\s\S]*?</script>')


def upgrade(path: Path, topic: str) -> str:
    html = path.read_text(encoding="utf-8")
    if "assets/mp.css" in html:
        return "already upgraded"
    logic_before = BABEL_BLOCK.findall(html)

    # 1. accent colour
    html, n = re.subn(r"<html([^>]*)>", lambda m: f'<html{m.group(1)} data-topic="{topic}">', html, count=1)
    assert n == 1, "no <html> tag"

    # 2. head additions after <title>
    html, n = re.subn(r"(</title>\n?)", lambda m: m.group(1) + HEAD_ADDITIONS, html, count=1)
    assert n == 1, "no <title>"

    # 3. wrap the page's own CSS in the legacy layer (first <style> only)
    start = html.index("<style>")
    end = html.index("</style>", start)
    css = html[start + len("<style>"):end]
    wrapped = "<style>\n@layer mp-base, legacy, mp, page;\n@layer legacy {" + css + "}\n</style>\n" + SHELL
    html = html[:start] + wrapped + html[end + len("</style>"):]

    # 4. pin library versions (and use the fast production React everywhere)
    html = re.sub(r'<script[^>]*src="https://unpkg\.com/react@18/umd/react\.[^"]+"[^>]*></script>',
                  f'<script crossorigin src="{REACT}"></script>', html)
    html = re.sub(r'<script[^>]*src="https://unpkg\.com/react-dom@18/umd/react-dom\.[^"]+"[^>]*></script>',
                  f'<script crossorigin src="{REACT_DOM}"></script>', html)
    html = re.sub(r'<script[^>]*src="https://unpkg\.com/@babel/standalone/babel\.min\.js"[^>]*></script>',
                  f'<script crossorigin src="{BABEL}"></script>', html)

    # 5. loading spinner (React replaces it when the exercise is ready)
    html, n = re.subn(r'<div id="root"></div>',
                      '<div id="root"><div class="mp-boot" aria-hidden="true"><span></span></div></div>', html, count=1)
    assert n == 1, "no empty #root"

    # safety: the logic must be byte-for-byte the same
    assert BABEL_BLOCK.findall(html) == logic_before, "logic block changed — aborting"
    path.write_text(html, encoding="utf-8")
    return "upgraded"


def main(argv):
    if argv[1:] == ["--all"]:
        jobs = list(TOPICS.items())
    elif len(argv) == 3:
        jobs = [(argv[1], argv[2])]
    else:
        print(__doc__)
        return 1
    for name, topic in jobs:
        print(f"{name:26} {topic:7} {upgrade(ROOT / name, topic)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

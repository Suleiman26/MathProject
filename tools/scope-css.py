#!/usr/bin/env python3
"""Prefix every selector in a CSS file with a scope (e.g. ".home"), so a page's
styles can't leak into other pages in the single-page app.

  python3 tools/scope-css.py <in.css> <out.css> <scope> [--root-map body=.home]

- Selectors inside @media / @supports / @layer are prefixed too.
- @keyframes and @font-face are left alone.
- :root and html stay as they are (tokens).
- --root-map lets "body" (or "body::before") become the scope element itself.
"""
import re
import sys


def scope_selector(sel, scope, root_map):
    out = []
    for part in sel.split(","):
        p = part.strip()
        if not p:
            continue
        if p.startswith(":root") or p == "html" or p.startswith("html ") or p.startswith("from") or p.startswith("to") or re.match(r"^\d+%$", p):
            out.append(p)
            continue
        replaced = False
        for src, dst in root_map.items():
            if p == src or p.startswith(src + ":") or p.startswith(src + " ") or p.startswith(src + "."):
                out.append(dst + p[len(src):])
                replaced = True
                break
        if not replaced:
            out.append(f"{scope} {p}")
    return ", ".join(out)


def transform(css, scope, root_map):
    out, i, n = [], 0, len(css)
    stack = []  # kinds of open blocks: "at-keep" (keyframes/font-face), "at", "rule"
    buf = ""
    while i < n:
        c = css[i]
        if css.startswith("/*", i):
            j = css.find("*/", i + 2)
            j = n if j < 0 else j + 2
            buf += css[i:j]
            i = j
            continue
        if c == "{":
            head = buf
            stripped = re.sub(r"/\*[\s\S]*?\*/", "", head).strip()
            in_keep = any(k == "at-keep" for k in stack)
            if stripped.startswith("@"):
                kind = "at-keep" if re.match(r"@(-\w+-)?(keyframes|font-face|property|counter-style)", stripped) else "at"
                out.append(head + "{")
                stack.append(kind)
            elif in_keep:
                out.append(head + "{")
                stack.append("rule")
            else:
                # keep any leading comment text in the head
                m = re.match(r"^([\s\S]*\*/)?([\s\S]*)$", head)
                comment, sel = (m.group(1) or ""), m.group(2)
                out.append(comment + lead_ws(sel) + scope_selector(sel, scope, root_map) + " {")
                stack.append("rule")
            buf = ""
            i += 1
            continue
        if c == "}":
            out.append(buf + "}")
            buf = ""
            if stack:
                stack.pop()
            i += 1
            continue
        if c == ";" and (not stack or stack[-1] in ("at",)) and buf.strip().startswith("@"):
            out.append(buf + ";")  # e.g. @layer a, b;
            buf = ""
            i += 1
            continue
        buf += c
        i += 1
    out.append(buf)
    return "".join(out)


def lead_ws(s):
    return s[: len(s) - len(s.lstrip())]


if __name__ == "__main__":
    src, dst, scope = sys.argv[1], sys.argv[2], sys.argv[3]
    root_map = {}
    for a in sys.argv[4:]:
        if a.startswith("--root-map"):
            continue
        if "=" in a:
            k, v = a.split("=", 1)
            root_map[k] = v
    css = open(src, encoding="utf-8").read()
    open(dst, "w", encoding="utf-8").write(transform(css, scope, root_map))

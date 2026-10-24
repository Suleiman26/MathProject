/* Screen inspector — paste into the browser console on any topic page
   (or run it from an automated browser). It opens every chapter and sub-tab
   and reports layout problems a student would feel:
     PAGE-OVERFLOW  the page scrolls sideways
     OUT            something sticks out of the screen
     SMALL-TAP      a button / input smaller than a fingertip (< 32px)
     TINY-TEXT      text smaller than 12px
     SCROLLS-X      a box the student has to scroll sideways
   It only clicks chapter tabs; it never answers questions or changes data.
   Usage: await mpAudit()  → { "chapter › sub-tab": [issues…] } */
window.mpAudit = async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const W = innerWidth;
  const tag = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 16);
    return el.tagName.toLowerCase() + (cls ? "." + cls : "") + (txt ? ' "' + txt + '"' : "");
  };
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden") return true;
    }
    return false;
  };
  function issues() {
    const out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push("PAGE-OVERFLOW " + document.documentElement.scrollWidth + "px");
    for (const el of document.querySelectorAll("#root *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden") continue;
      const inSvg = el.closest("svg") && el.tagName.toLowerCase() !== "svg";
      if (!inSvg && !clipped(el) && (r.right > W + 1 || r.left < -1)) out.push("OUT " + tag(el) + " [" + Math.round(r.left) + "→" + Math.round(r.right) + "]");
      if (el.matches("button, input:not([type=range]):not([type=checkbox]):not([type=radio]), select") && (r.height < 32 || r.width < 32))
        out.push("SMALL-TAP " + tag(el) + " " + Math.round(r.width) + "×" + Math.round(r.height));
      if (!inSvg && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 12)
        out.push("TINY-TEXT " + tag(el) + " " + cs.fontSize);
      if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2)
        out.push("SCROLLS-X " + tag(el) + " " + el.scrollWidth + "/" + el.clientWidth);
    }
    return [...new Set(out)];
  }
  const res = {};
  const CH = ".ch-btn, .nav-btn";
  const SUB = "#root .sub-tab, #root .sub-tab-btn, #root .sub-btn, #root .tab, #root .diff-btn";
  const n = document.querySelectorAll(CH).length || 1;
  for (let i = 0; i < n; i++) {
    const b = document.querySelectorAll(CH)[i];
    if (b) { b.click(); await wait(400); }
    const name = b ? b.textContent.trim() : "main";
    res[name] = issues();
    const m = document.querySelectorAll(SUB).length;
    for (let j = 1; j < m; j++) {
      const s = document.querySelectorAll(SUB)[j];
      if (!s) break;
      s.click(); await wait(350);
      res[name + " › " + s.textContent.trim()] = issues();
    }
    const first = document.querySelectorAll(SUB)[0];
    if (first) { first.click(); await wait(200); }
  }
  return res;
};

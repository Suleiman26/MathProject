/* A tiny HTML → DOM-like tree, only for snapshot.test.mjs (the fixtures come from tools/review-fixtures.mjs,
   so the markup is regular: quoted attributes, void inputs, no comments inside). Nodes carry what
   serialize() reads: nodeType, nodeName, childNodes, nodeValue, getAttribute, hasAttribute. */
const VOID = new Set(["input", "br", "hr", "img", "meta", "link", "source", "wbr", "col", "area"]);
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+[0-9]*);/gi, (m, e) => {
  if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1));
  return ENT[e] !== undefined ? ENT[e] : m;
});

function el(name, attrs, parent) {
  return {
    nodeType: 1, nodeName: name.toUpperCase(), childNodes: [], parentNode: parent, attrs,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
  };
}

/** parse a fragment; returns a document-fragment-like node (nodeType 11) */
export function parseHTML(html) {
  const frag = { nodeType: 11, nodeName: "#document-fragment", childNodes: [] };
  const stack = [frag];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {                                     // a closing tag: pop to the matching one
      const name = m[1].toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].nodeName === name) { stack.length = i; break; }
    } else if (m[2]) {
      const attrs = {};
      const ar = /([^\s=>/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let a;
      while ((a = ar.exec(m[3] || ""))) attrs[a[1].toLowerCase()] = decode(a[3] ?? a[4] ?? a[5] ?? "");
      const node = el(m[2], attrs, top);
      top.childNodes.push(node);
      if (!VOID.has(m[2].toLowerCase()) && !m[4]) stack.push(node);
    } else if (m[5]) {
      top.childNodes.push({ nodeType: 3, nodeName: "#text", nodeValue: decode(m[5]), childNodes: [], parentNode: top });
    }
  }
  return frag;
}

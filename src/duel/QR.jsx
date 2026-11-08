'use client';
/* Duels: my friend link as a QR code, drawn on the device (no external service).
   qrcode-generator → one SVG path, crisp at any size. The sheet around it shows
   the link and the code in words too (for a friend who can't scan). */
import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { Sheet } from "./Sheet";

/** <QRCode text size /> — an SVG of the text. */
export function QRCode({ text, size = 220, className }) {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(String(text || ""));
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n, d };
  }, [text]);
  return (
    <svg className={className} viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label="קוד QR לקישור החבר שלי" shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#1c1b19" />
    </svg>
  );
}

export function QRSheet({ open, onClose, link, code }) {
  return (
    <Sheet open={open} onClose={onClose} label="הקוד שלי בתור QR" className="dl-qr">
      <p className="dl-sh-k">סורקים — ומוסיפים אותי</p>
      <h2 className="dl-sh-t">תנו לחבר לסרוק</h2>
      <div className="dl-qr-box"><QRCode text={link} size={232} /></div>
      <p className="dl-qr-code" dir="ltr">{fmtCode(code)}</p>
      <p className="dl-qr-link" dir="ltr">{link.replace(/^https?:\/\//, "")}</p>
      <p className="dl-sh-m">הסריקה פותחת את הדף שלי; לחיצה אחת שם שולחת לי בקשת חברות.</p>
    </Sheet>
  );
}

/** "K7M2PQ" → "K7M 2PQ" (easier to read aloud) */
export function fmtCode(code) {
  const c = String(code || "").toUpperCase();
  return c.length === 6 ? c.slice(0, 3) + " " + c.slice(3) : c;
}

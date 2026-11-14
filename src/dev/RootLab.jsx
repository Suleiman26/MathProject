'use client';
/* Local-only preview of the shared root sign (src/components/Root.jsx, fixes board #65):
   every way the site uses it, at several sizes. /dev/roots */
import { Root, RootText } from "@/components/Root";
import { MathText, MathSpan } from "@/duel/MathText";

const Fr = ({ n, d }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 .2em", lineHeight: 1.15 }}>
    <span style={{ borderBottom: ".08em solid currentColor", padding: "0 .3em .12em" }}>{n}</span>
    <span style={{ padding: ".1em .3em 0" }}>{d}</span>
  </span>
);
const box = { background: "#fff", border: "1px solid #e5e2da", borderRadius: 14, padding: "14px 16px", margin: "12px 0" };
const h = { font: "600 13px/1.3 Rubik, system-ui", color: "#6b675f", margin: "0 0 8px" };

export default function RootLab() {
  return (
    <main dir="rtl" style={{ maxWidth: 720, margin: "0 auto", padding: "16px", fontFamily: "Rubik, system-ui", color: "#1c1b19" }}>
      <h1 style={{ fontSize: 20, margin: "4px 0 8px" }}>סימן השורש</h1>

      <section style={box} id="sizes">
        <p style={h}>גדלים (13 / 16 / 22 / 34 px)</p>
        {[13, 16, 22, 34].map((s) => (
          <div key={s} dir="ltr" style={{ fontSize: s, margin: "8px 0", textAlign: "left" }}>
            c = <Root>a² + b²</Root> = <Root>36 + 64</Root> = <Root>100</Root> = 10 &nbsp; 2<Root>3</Root> + 5<Root>3</Root> = 7<Root>3</Root>
          </div>
        ))}
      </section>

      <section style={box} id="formula">
        <p style={h}>נוסחת השורשים, שבר בתוך שורש, שורש בתוך שורש</p>
        <div dir="ltr" style={{ fontSize: 24, fontWeight: 700, textAlign: "center", margin: "10px 0" }}>
          x<sub>1,2</sub> = <Fr n={<>−b ± <Root>b² − 4ac</Root></>} d="2a" />
        </div>
        <div dir="ltr" style={{ fontSize: 22, textAlign: "center", margin: "14px 0" }}>
          <Root><Fr n="9" d="16" /></Root> = <Fr n="3" d="4" /> &nbsp;&nbsp; <Root>16 + <Root>81</Root></Root> = 5 &nbsp;&nbsp; <Root>x<sup>6</sup>·y<sup>4</sup></Root>
        </div>
      </section>

      <section style={box} id="text">
        <p style={h}>בתוך משפט בעברית (מחרוזות)</p>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}><RootText s="אלכסון של אחת הפאות (הריבועים); מחשבים אותו לפי פיתגורס: a√2." /></p>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}><RootText s="קטע המחבר שני קודקודים נגדיים דרך תוך הגוף; d = √(l²+w²+h²)." /></p>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}><RootText s="שלב 2: אלכסון מרחבי d = √(d_בסיס² + a²) = a√3" /></p>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}><RootText s="בסיס משולש שווה-צלעות: b = 6, אפותם m = 5 (שטח הבסיס = 9√3)" /></p>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}><RootText s="שלב 3: חשבו את הנפח (מקדם × √3)" /></p>
        <p style={{ fontSize: 16, lineHeight: 1.7 }}><RootText s="גובה הפאה הצדדית; m = √(h²+(חצי-צלע)²)." /></p>
        <p dir="ltr" style={{ fontSize: 20, textAlign: "left" }}><RootText s="√(x^6·y^4) = x^?·y^?   (√a · √b)^2 = a·b   √12 = √(4·3) = 2√3" pow flat /></p>
      </section>

      <section style={box} id="inputs">
        <p style={h}>תיבות תשובה מתחת לשורש</p>
        <div dir="ltr" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 20, fontWeight: 700 }}>
          <input placeholder="מקדם" style={{ width: 56, height: 44, textAlign: "center", border: "2px solid #c4b5fd", borderRadius: 10 }} />
          <Root row><input placeholder="?" style={{ width: 56, height: 44, textAlign: "center", border: "2px solid #c4b5fd", borderRadius: 10 }} /></Root>
          <span>&nbsp;</span>
          <Root row>
            <input placeholder="ריבועי" style={{ width: 56, height: 44, textAlign: "center", border: "2px solid #c4b5fd", borderRadius: 10 }} />
            <span>·</span>
            <input placeholder="שארית" style={{ width: 56, height: 44, textAlign: "center", border: "2px solid #c4b5fd", borderRadius: 10 }} />
          </Root>
        </div>
      </section>

      <section style={box} id="duel">
        <p style={h}>שאלות דו-קרב (MathText)</p>
        <div style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}><MathText text={"חשבו: $\\sqrt{50} · \\sqrt{2} = ?$"} /></div>
        <div style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginTop: 10 }}><MathText text={"פשטו: $\\sqrt{x^{6}} · x^{2} = x^{?}$"} /></div>
        <div dir="ltr" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, fontSize: 20, fontWeight: 700 }}>
          {["5\\sqrt{2}", "2\\sqrt{5}", "\\frac{\\sqrt{3}}{4}", "100\\sqrt{3}"].map((c) => (
            <span key={c} style={{ border: "2px solid #e5e2da", borderRadius: 14, padding: "10px 16px", minWidth: 64, textAlign: "center" }}><MathSpan src={c} /></span>
          ))}
        </div>
      </section>
    </main>
  );
}

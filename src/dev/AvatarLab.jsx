'use client';
/* Local comparison of 3D avatar candidates (app/dev/avatars).
   ?v=all shows every downloaded model; the default shows the styles to choose from. */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AvatarStage = dynamic(() => import("./AvatarStage"), { ssr: false });
const M = (n) => `/dev-avatars/${n}.glb`;
const WEAPONS = "knife|crossbow|throwable|spellbook|wand|staff|sword|axe|shield|dagger";
const STYLES = [
  { id: "toy", name: "1. צעצוע (KayKit)", about: "ראש גדול, חמוד מאוד. בנוי מחלקים (כובע, גלימה), טוב לחנות.", hide: WEAPONS, framing: { f: 0.58, s: 1.2 },
    items: [{ char: "kk_mage", pet: "cat2", petSize: 0.26, petTurn: 0.5, petOut: 0.3, petFwd: 0.12, petLift: 0.02, label: "בן + חתול" }, { char: "kk_rogue", pet: "birb", petSize: 0.22, petTurn: -0.5, side: "L", petOut: 0.3, petFwd: 0.12, petLift: 0.02, label: "בת + ציפור" }] },
  { id: "block", name: "2. קוביות (כמו מיינקראפט)", about: "דמויות וחיות מאותו סגנון מרובע. ילדים מכירים ואוהבים.", framing: { f: 0.55, s: 1.25 },
    items: [{ char: "cubeguy", pet: "cat3", petSize: 0.24, petTurn: 0.4, petOut: 0.36, petFwd: 0.16, petLift: 0.0, label: "בן + חתול" }, { char: "cubewoman", pet: "raccoon", petSize: 0.24, petTurn: -0.4, side: "L", petOut: 0.38, petFwd: 0.16, petLift: 0.0, label: "בת + דביבון" }] },
  { id: "real", name: "3. רגיל (low-poly)", about: "פרופורציות של מבוגרים, פחות ילדותי.", framing: { f: 0.72, s: 0.8 },
    items: [{ char: "casual", pet: "shiba", petSize: 0.16, petTurn: -0.5, label: "בן + כלב" }, { char: "woman3", pet: "fox", petSize: 0.15, petTurn: 0.5, side: "L", label: "בת + שועל" }] },
];
const ALL = ["platformer", "charanim", "adventurer", "mako", "bunny", "woman1", "woman2", "woman3", "casual", "cubeguy", "cubewoman", "kk_rogue", "kk_mage", "fox", "husky", "shiba", "pug", "raccoon", "bird", "birb", "cat2", "cat3", "panda", "dino", "penguin"];

export default function AvatarLab() {
  const [v, setV] = useState(null);
  const [pg, setPg] = useState(1);
  useEffect(() => { const q = new URLSearchParams(location.search); setV(q.get("v") || "styles"); setPg(+q.get("p") || 1); }, []);
  if (!v) return null;
  return (
    <main className="av-lab" dir="rtl">
      <style>{`
        .av-lab { font-family: var(--font); max-width: 1100px; margin: 0 auto; padding: 18px 14px 60px; color: var(--ink); }
        .av-lab h1 { font-size: 1.5rem; margin: 0 0 6px; } .av-lab > p { color: var(--ink-2); margin: 0 0 18px; }
        .av-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .av-stage { position: relative; margin: 0; border-radius: 22px; overflow: hidden; background: radial-gradient(80% 70% at 50% 30%, #fff, #eef1f6); box-shadow: 0 0 0 1px var(--line); }
        .av-canvas, .av-canvas canvas { width: 100%; height: 100%; display: block; }
        .av-wait { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-3); font-size: .85rem; }
        .av-style { margin: 0 0 26px; } .av-style h2 { font-size: 1.15rem; margin: 0 0 2px; } .av-style > p { margin: 0 0 10px; color: var(--ink-2); font-size: .9rem; }
        .av-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .av-stage figcaption { position: absolute; bottom: 8px; right: 10px; font-size: .8rem; font-weight: 700; background: rgb(255 255 255 / .85); padding: 2px 8px; border-radius: 999px; }
      `}</style>
      {v === "trellis" ? (
        <>
          <h1>TRELLIS.2: ציור ← תלת-ממד</h1>
          <div className="av-pair">
            <AvatarStage char={M("boy-chibi")} framing="full" height={520} label="צ׳יבי · כל הגוף" />
            <AvatarStage char={M("boy-chibi")} framing={{ f: 0.7, s: 0.62 }} height={520} label="צ׳יבי · פנים מקרוב" />
          </div>
          <h2 style={{ fontSize: "1.1rem", margin: "22px 0 8px" }}>בגודל של הכותרת</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
            <div style={{ width: 130 }}><AvatarStage char={M("boy-chibi")} framing={{ f: 0.62, s: 0.8 }} height={130} /></div>
            <div style={{ width: 90 }}><AvatarStage char={M("boy-chibi")} framing={{ f: 0.66, s: 0.7 }} height={90} /></div>
            <div style={{ width: 160 }}><AvatarStage char={M("trellis-boy1")} framing="full" height={200} label="הקודם" /></div>
          </div>
        </>
      ) : v === "all" ? (
        <>
          <h1>כל הדגמים שהורדו</h1>
          <div className="av-grid">{ALL.slice((pg - 1) * 8, pg * 8).map((n) => <AvatarStage key={n} char={M(n)} framing="full" height={240} label={n} />)}</div>
        </>
      ) : (
        <>
          <h1>אווטר + חיה על הכתף: 3 סגנונות</h1>
          <p>כל דמות זזה בעדינות (נשימה), והחיה יושבת על הכתף וזזה גם היא.</p>
          {STYLES.map((st) => (
            <section key={st.id} className="av-style">
              <h2>{st.name}</h2><p>{st.about}</p>
              <div className="av-pair">
                {st.items.map((it, k) => <AvatarStage key={k} height={330} framing={st.framing} hide={st.hide} {...it} char={M(it.char)} pet={M(it.pet)} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}

'use client';
/* Chapter 2 of the equations topic, before the practice (fixes board #90, Sulaiman):
   what an equation is (two expressions with the same value, the "=" between them),
   two everyday examples, the balance, "what you do on one side you do on the other",
   isolating the unknown with the opposite operation, and one full worked example.
   Styles: src/styles/topic-fixes.css (classes wx-* shared with chapter 1, eqx-* here). */
import React from 'react';
import { Ex, Rich } from './WordsChapter';

/* an equation: each side drawn by the chapter-1 renderer, "=" between them */
function Eq({ s, hot }) {
  const [l, r] = s.split('=');
  return (
    <span dir="ltr" className={`eqx-eq${hot ? ' hot' : ''}`}>
      <Ex s={l.trim()} /><span className="eqx-is">=</span><Ex s={r.trim()} />
    </span>
  );
}

/* balanced scales: a label on each pan (plain LTR math text) */
function Balance({ left, right, caption }) {
  return (
    <figure className="eqx-bal">
      <svg viewBox="0 0 320 150" role="img" aria-label={`מאזניים מאוזנים: בכף אחת ${left}, ובכף השנייה ${right}`}>
        <path d="M160 40 L144 132 L176 132 Z" className="eqx-stand" />
        <rect x="118" y="130" width="84" height="8" rx="4" className="eqx-stand" />
        <rect x="34" y="34" width="252" height="7" rx="3.5" className="eqx-beam" />
        <circle cx="160" cy="37" r="7" className="eqx-pin" />
        <line x1="62" y1="41" x2="44" y2="86" className="eqx-cord" /><line x1="62" y1="41" x2="80" y2="86" className="eqx-cord" />
        <line x1="258" y1="41" x2="240" y2="86" className="eqx-cord" /><line x1="258" y1="41" x2="276" y2="86" className="eqx-cord" />
        <path d="M14 86 H110 Q104 110 62 110 Q20 110 14 86 Z" className="eqx-pan" />
        <path d="M210 86 H306 Q300 110 258 110 Q216 110 210 86 Z" className="eqx-pan" />
        <text x="62" y="76" className="eqx-load" direction="ltr">{left}</text>
        <text x="258" y="76" className="eqx-load" direction="ltr">{right}</text>
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export default function EqLesson({ onStart }) {
  return (
    <>
      <div className="card wx-lesson">
        <div className="card-t">מה זו משוואה?</div>
        <p>משוואה היא שני ביטויים שכתובים בצורה שונה, אבל יש להם אותו ערך. בין שני הביטויים כותבים את סימן השוויון <b className="eqx-sign">=</b>.</p>
        <div className="eqx-vs">
          <div><span>ביטוי אלגברי, בלי סימן שוויון</span><b><Ex s="x+3" /></b></div>
          <div className="on"><span>משוואה: יש סימן שוויון</span><b><Eq s="x+3=10" hot /></b></div>
        </div>
        <p className="wx-note">סימן השוויון הוא מה שהופך את הכתוב למשוואה. הוא אומר: מה שכתוב משמאלו שווה בדיוק למה שכתוב מימינו.</p>
        <div className="wx-say">
          <span className="wx-say-t">דוגמה ראשונה</span>
          <p><Rich text="בקופסה יש [[x]] עפרונות. הוסיפו לקופסה 3 עפרונות, ועכשיו יש בה 10 עפרונות." /></p>
          <p className="eqx-line"><Eq s="x+3=10" /></p>
          <p><Rich text="שני הצדדים מתארים את אותו דבר: כמה עפרונות יש עכשיו בקופסה. בצד אחד זה כתוב כ-[[x+3]], ובצד השני כ-10." /></p>
        </div>
        <div className="wx-say">
          <span className="wx-say-t">דוגמה שנייה</span>
          <p><Rich text="דנה קנתה 4 מחברות, וכל המחברות באותו מחיר. היא שילמה 20 שקלים. נסמן ב-[[x]] את המחיר של מחברת אחת." /></p>
          <p className="eqx-line"><Eq s="4x=20" /></p>
          <p><Rich text="בצד אחד: מחיר 4 מחברות, [[4x]]. בצד השני: הסכום ששילמה, 20. אלה אותו סכום, ולכן כותבים ביניהם סימן שוויון." /></p>
        </div>
      </div>

      <div className="card wx-lesson">
        <div className="card-t">משוואה היא כמו מאזניים מאוזנים</div>
        <p>לשני הצדדים של המשוואה קוראים <b>אגפים</b>. שני האגפים שווים, כמו שתי הכפות של מאזניים מאוזנים.</p>
        <Balance left="x + 3" right="10" caption="האגף השמאלי והאגף הימני שוקלים אותו דבר" />
        <p>מותר לעשות פעולה על המשוואה, אבל רק על שני האגפים יחד: <b>מה שעושים באגף אחד, עושים גם באגף השני.</b> כך המאזניים נשארים מאוזנים, והמשוואה נשארת נכונה.</p>
        <Balance left="x + 3 − 3" right="10 − 3" caption="מורידים 3 משתי הכפות, והמאזניים עדיין מאוזנים" />
        <p className="eqx-line"><Eq s="x=7" hot /></p>
        <p className="wx-note">אם מורידים 3 רק מכף אחת, המאזניים נוטים לצד אחד והמשוואה כבר לא נכונה.</p>
      </div>

      <div className="card wx-lesson">
        <div className="card-t">המטרה: לבודד את הנעלם</div>
        <p><Rich text="כשיש במשוואה נעלם אחד, המטרה היא למצוא כמה הוא שווה. עושים זאת על ידי בידוד: משאירים את [[x]] לבד באגף אחד, ובאגף השני נשאר מספר." /></p>
        <p>מבודדים בעזרת <b>הפעולה ההפוכה</b>. כל פעולה מבטלת את הפעולה ההפוכה לה:</p>
        <div className="eqx-ops" role="table" aria-label="פעולות הפוכות">
          <div className="eqx-op" role="row">
            <b role="cell" dir="ltr">+ ⇄ −</b>
            <span role="cell"><Rich text="חיבור הפוך לחיסור. אם ל-[[x]] הוסיפו 3, מחסירים 3 משני האגפים." /></span>
          </div>
          <div className="eqx-op" role="row">
            <b role="cell" dir="ltr">× ⇄ ÷</b>
            <span role="cell"><Rich text="כפל הפוך לחילוק. אם [[x]] מוכפל ב-4, מחלקים את שני האגפים ב-4." /></span>
          </div>
        </div>
      </div>

      <div className="card wx-lesson">
        <div className="card-t">דוגמה פתורה</div>
        <p className="wx-story">פתרו את המשוואה:</p>
        <p className="eqx-line eqx-big"><Eq s="3x+5=20" /></p>
        <ol className="wx-steps eqx-steps">
          <li>
            <span><Rich text="המטרה: [[x]] לבד באגף אחד. קודם מורידים את ה-5 שנוסף. הפעולה ההפוכה לחיבור היא חיסור, ולכן מחסירים 5 משני האגפים:" /></span>
            <span className="eqx-work"><Eq s="3x+5-5=20-5" /><Eq s="3x=15" hot /></span>
          </li>
          <li>
            <span><Rich text="עכשיו [[x]] מוכפל ב-3. הפעולה ההפוכה לכפל היא חילוק, ולכן מחלקים את שני האגפים ב-3:" /></span>
            <span className="eqx-work"><Eq s="3x/3=15/3" /><Eq s="x=5" hot /></span>
          </li>
          <li>
            <span><Rich text="בודקים: מציבים 5 במקום [[x]] במשוואה המקורית." /></span>
            <span className="eqx-work"><span dir="ltr" className="eqx-eq"><Ex s="3*5+5" /><span className="eqx-is">=</span><Ex s="15+5" /><span className="eqx-is">=</span><Ex s="20" /></span></span>
          </li>
        </ol>
        <div className="wx-result">
          <div><span>יצא 20, כמו באגף הימני. הפתרון נכון:</span><b><Eq s="x=5" /></b></div>
        </div>
        <p className="wx-note">בתרגול בוחרים פעולה ומספר בתיבה שמעל האגפים, והאתר עושה את הפעולה על שני האגפים יחד.</p>
      </div>

      <div className="center wx-go">
        <button className="btn bp wx-start" onClick={onStart}>הבנתי, לתרגול</button>
      </div>
    </>
  );
}

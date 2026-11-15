/* הסתברות (כיתות ז׳–ח׳) — board #84 */
import { COL, COLS, ballsText, joinHe, fr, frEq, sameFrac, holds, brute, closed, evText, randEvent, favText } from './util.js';

const countCols = (list, cols) => list.filter((c) => cols.includes(c)).length;

/* one ball out of a bag */
const bag = {
  id: 'bag',
  make(R) {
    const k = R.pick([2, 3, 3]);
    const cols = R.shuffle(COLS).slice(0, k);
    let n;
    do { n = cols.map(() => R.int(2, 6)); } while (new Set(n).size < 2);
    const N = n.reduce((s, v) => s + v, 0);
    const two = k === 3 && R.bool(0.4);
    const want = two ? [cols[0], cols[1]] : [cols[R.int(0, k - 1)]];
    const fav = want.reduce((s, c) => s + n[cols.indexOf(c)], 0);
    const desc = want.map((c) => COL[c].one).join(' או ');
    return {
      tag: 'הוצאת כדור משקית',
      text: `בשקית יש ${joinHe(cols.map((c, i) => ballsText(n[i], c)))}. מוציאים כדור אחד בלי להסתכל. מה ההסתברות שהכדור יהיה ${desc}?`,
      fig: { type: 'balls', balls: R.shuffle(cols.flatMap((c, i) => Array(n[i]).fill(c))), alt: 'הכדורים שבשקית' },
      rows: [{ label: 'ההסתברות:', parts: [{ frac: [fav, N] }] }],
      hint: 'הסתברות היא מספר התוצאות המתאימות חלקי מספר כל התוצאות האפשריות. כמה כדורים יש בשקית בסך הכול?',
      steps: [
        `מספר כל הכדורים: [[${n.join(' + ')} = ${N}]]`,
        two ? `כדורים מתאימים (${desc}): [[${want.map((c) => n[cols.indexOf(c)]).join(' + ')} = ${fav}]]` : `מספר הכדורים ה${COL[want[0]].many}: [[${fav}]]`,
        `ההסתברות: [[${frEq(fav, N)}]]`,
      ],
      data: { want },
    };
  },
  verify(q) {
    const balls = q.fig.balls, { want } = q.data;
    let fav = 0;
    for (const b of balls) if (want.includes(b)) fav++;
    if (fav === 0 || fav === balls.length) return 'degenerate event';
    for (const c of new Set(balls)) { const n = countCols(balls, [c]); if (!q.text.includes(`[[${n}]] כדורים ${COL[c].many}`)) return `text and drawing differ for ${c}`; }
    return sameFrac(q.rows[0].parts[0], fav, balls.length) ? true : 'probability is wrong';
  },
};

/* a die or numbered cards */
const numbers = {
  id: 'die-cards',
  make(R) {
    const n = R.pick([6, 6, 6, 8, 10, 12, 20]);
    const ev = randEvent(R, n), fav = closed(ev, n);
    const intro = n === 6
      ? 'מטילים קוביית משחק הוגנת.'
      : `בקופסה [[${n}]] כרטיסים, ועליהם המספרים מ-[[1]] עד [[${n}]]. מוציאים כרטיס אחד באקראי.`;
    return {
      tag: n === 6 ? 'הטלת קובייה' : 'כרטיסים ממוספרים',
      text: `${intro} מה ההסתברות לקבל ${evText(ev)}?`,
      rows: [{ label: 'ההסתברות:', parts: [{ frac: [fav, n] }] }],
      hint: ev.t === 'prime'
        ? `מספר ראשוני מתחלק רק ב-[[1]] ובעצמו. שימו לב: [[1]] אינו מספר ראשוני. רשמו את כל המספרים הראשוניים עד [[${n}]].`
        : `רשמו את כל המספרים המתאימים מבין [[1]] עד [[${n}]] וספרו אותם.`,
      steps: [
        `מספר כל התוצאות האפשריות: [[${n}]], ולכולן אותו סיכוי.`,
        `התוצאות המתאימות: [[${favText(ev, n)}]]. יש [[${fav}]] כאלה.`,
        `ההסתברות: [[${frEq(fav, n)}]]`,
      ],
      data: { n, ev },
    };
  },
  verify(q) {
    const { n, ev } = q.data, fav = brute(ev, n);
    if (fav === 0 || fav === n) return 'degenerate event';
    if (!q.text.includes(evText(ev))) return 'the event is not in the text';
    return sameFrac(q.rows[0].parts[0], fav, n) ? true : `probability should be ${fav}/${n}`;
  },
};

/* a wheel of equal sectors */
const spinner = {
  id: 'spinner',
  make(R) {
    const n = R.pick([4, 5, 6, 8, 10]), k = n === 4 ? 2 : R.pick([2, 3]);
    const cols = R.shuffle(COLS).slice(0, k);
    let cnt;
    do {
      cnt = cols.map(() => 1);
      for (let i = k; i < n; i++) cnt[R.int(0, k - 1)]++;
    } while (k > 1 && new Set(cnt).size < 2 && n !== 4 && n !== 6);
    const two = k === 3 && R.bool(0.35);
    const want = two ? [cols[0], cols[1]] : [cols[R.int(0, k - 1)]];
    const fav = want.reduce((s, c) => s + cnt[cols.indexOf(c)], 0);
    const desc = want.map((c) => COL[c].one).join(' או ');
    const sectors = R.shuffle(cols.flatMap((c, i) => Array(cnt[i]).fill(c))).map((color) => ({ color }));
    return {
      tag: 'גלגל מזל',
      text: `מסובבים את גלגל המזל שבציור. הוא מחולק ל-[[${n}]] גזרות שוות. מה ההסתברות שהגלגל ייעצר על צבע ${desc}?`,
      fig: { type: 'spinner', sectors, alt: `גלגל מזל עם ${n} גזרות שוות` },
      rows: [{ label: 'ההסתברות:', parts: [{ frac: [fav, n] }] }],
      hint: 'הגזרות שוות, ולכן לכל גזרה אותו סיכוי. ספרו כמה גזרות בצבע המתאים יש מתוך כל הגזרות.',
      steps: [
        `מספר כל הגזרות: [[${n}]]`,
        `מספר הגזרות בצבע ${desc}: [[${two ? `${want.map((c) => cnt[cols.indexOf(c)]).join(' + ')} = ` : ''}${fav}]]`,
        `ההסתברות: [[${frEq(fav, n)}]]`,
      ],
      data: { want },
    };
  },
  verify(q) {
    const cols = q.fig.sectors.map((s) => s.color), fav = countCols(cols, q.data.want);
    if (fav === 0 || fav === cols.length) return 'degenerate event';
    if (!q.text.includes(`[[${cols.length}]] גזרות`)) return 'number of sectors differs';
    return sameFrac(q.rows[0].parts[0], fav, cols.length) ? true : 'probability is wrong';
  },
};

/* impossible (0), certain (1) and an ordinary event */
const certain = {
  id: 'certain-impossible',
  make(R) {
    let text, fig, events, why;
    if (R.bool()) {
      const [a, b, other] = R.shuffle(COLS);
      let na, nb;
      do { na = R.int(2, 6); nb = R.int(2, 6); } while (na === nb);
      const balls = R.shuffle([...Array(na).fill(a), ...Array(nb).fill(b)]);
      text = `בשקית יש ${ballsText(na, a)} ו-${ballsText(nb, b)}. מוציאים כדור אחד בלי להסתכל. כתבו את ההסתברות של כל מאורע.`;
      fig = { type: 'balls', balls, alt: 'הכדורים שבשקית' };
      events = [
        { label: `יוצא כדור ${COL[other].one}:`, kind: 0, cols: [other], why: `אין בשקית כדורים ${COL[other].many}, ולכן המאורע בלתי אפשרי: ההסתברות [[0]].` },
        { label: `יוצא כדור ${COL[a].one} או ${COL[b].one}:`, kind: 1, cols: [a, b], why: `כל הכדורים בשקית ${COL[a].many} או ${COL[b].many}, ולכן המאורע ודאי: ההסתברות [[1]].` },
        { label: `יוצא כדור ${COL[a].one}:`, kind: 2, cols: [a], why: `יש [[${na}]] כדורים ${COL[a].many} מתוך [[${na + nb}]]: ההסתברות [[${frEq(na, na + nb)}]].` },
      ];
      events.forEach((e) => { e.fav = e.kind === 0 ? 0 : e.kind === 1 ? na + nb : na; e.all = na + nb; });
    } else {
      const no = R.pick([{ t: 'gt', k: 6 }, { t: 'eq', k: 7 }, { t: 'lt', k: 1 }, { t: 'eq', k: 0 }, { t: 'gt', k: R.int(7, 9) }]);
      const yes = R.pick([{ t: 'lt', k: 7 }, { t: 'ge', k: 1 }, { t: 'le', k: 6 }, { t: 'gt', k: 0 }, { t: 'lt', k: R.int(8, 10) }]);
      const mid = randEvent(R, 6);
      text = 'מטילים קוביית משחק הוגנת. כתבו את ההסתברות של כל מאורע.';
      events = [
        { label: `מתקבל ${evText(no)}:`, kind: 0, ev: no, why: `אי אפשר לקבל בקובייה ${no.t === 'eq' ? 'את ' : ''}${evText(no)}, ולכן המאורע בלתי אפשרי: ההסתברות [[0]].` },
        { label: `מתקבל ${evText(yes)}:`, kind: 1, ev: yes, why: `כל תוצאה בקובייה היא ${evText(yes)}, ולכן המאורע ודאי: ההסתברות [[1]].` },
        { label: `מתקבל ${evText(mid)}:`, kind: 2, ev: mid, why: `התוצאות המתאימות: [[${favText(mid, 6)}]], מתוך [[6]]: ההסתברות [[${frEq(closed(mid, 6), 6)}]].` },
      ];
      events.forEach((e) => { e.fav = closed(e.ev, 6); e.all = 6; });
    }
    events = R.shuffle(events);
    why = events.map((e) => e.why);
    return {
      tag: 'מאורע ודאי ומאורע בלתי אפשרי',
      text,
      ...(fig ? { fig } : {}),
      rows: events.map((e) => ({ label: e.label, parts: [e.kind === 2 ? { frac: [e.fav, e.all] } : { ans: e.kind }] })),
      hint: 'מאורע שלא יכול לקרות הוא בלתי אפשרי, וההסתברות שלו [[0]]. מאורע שקורה תמיד הוא ודאי, וההסתברות שלו [[1]].',
      steps: why,
      data: { events: events.map((e) => (e.ev ? { ev: e.ev } : { cols: e.cols })) },
    };
  },
  verify(q) {
    const outcomes = q.fig ? q.fig.balls : [1, 2, 3, 4, 5, 6];
    const kinds = new Set();
    for (let i = 0; i < q.data.events.length; i++) {
      const e = q.data.events[i], box = q.rows[i].parts[0];
      const fav = outcomes.filter((o) => (e.ev ? holds(e.ev, o) : e.cols.includes(o))).length;
      if (fav === 0) { if (box.ans !== 0) return 'impossible event must be 0'; kinds.add(0); }
      else if (fav === outcomes.length) { if (box.ans !== 1) return 'certain event must be 1'; kinds.add(1); }
      else { if (!sameFrac(box, fav, outcomes.length)) return 'probability is wrong'; kinds.add(2); }
    }
    return kinds.size === 3 ? true : 'needs one impossible, one certain and one ordinary event';
  },
};

/* probability estimated from an experiment (relative frequency) */
const experiment = {
  id: 'experiment',
  make(R) {
    const cols = R.shuffle(COLS).slice(0, 3), M = R.pick([10, 20]), N = M * R.pick([5, 10, 20]);
    let m;
    do { m = [R.int(1, M - 2), R.int(1, M - 2)]; m.push(M - m[0] - m[1]); } while (m[2] < 1 || new Set(m).size < 3);
    const f = m.map((v) => (v * N) / M), i = R.int(0, 2), c = cols[i];
    return {
      tag: 'הסתברות לפי ניסוי',
      text: `בשקית [[${M}]] כדורים בשלושה צבעים, ולא ידוע כמה יש מכל צבע. הוציאו כדור, רשמו את צבעו והחזירו אותו לשקית. חזרו על כך [[${N}]] פעמים, ואלה התוצאות:`,
      fig: { type: 'table', head: ['צבע הכדור', 'מספר הפעמים'], rows: cols.map((x, n) => [COL[x].one, `[[${f[n]}]]`]) },
      rows: [
        { label: `לפי הניסוי, מה ההסתברות להוציא כדור ${COL[c].one}?`, parts: [{ frac: [f[i], N] }] },
        { label: `כמה כדורים ${COL[c].many} יש בשקית, ככל הנראה?`, parts: [{ ans: m[i] }] },
      ],
      hint: 'כשלא יודעים מה יש בשקית, אומדים את ההסתברות לפי השכיחות היחסית בניסוי: מספר הפעמים שיצא הצבע חלקי מספר כל ההוצאות.',
      steps: [
        `השכיחות היחסית של ${COL[c].one}: [[${frEq(f[i], N)}]]. זה האומדן להסתברות.`,
        `בשקית [[${M}]] כדורים, ולכן מספר הכדורים ה${COL[c].many} הוא בערך [[${fr(f[i], N)} * ${M} = ${m[i]}]]`,
      ],
      data: { M, N, i },
    };
  },
  verify(q) {
    const { M, N, i } = q.data;
    const f = q.fig.rows.map((r) => Number(r[1].replace(/[[\]]/g, '')));
    if (f.reduce((s, v) => s + v, 0) !== N) return 'the table does not add up to the number of trials';
    if (!sameFrac(q.rows[0].parts[0], f[i], N)) return 'estimated probability is wrong';
    const m = q.rows[1].parts[0].ans;
    return Number.isInteger(m) && m >= 1 && m < M && m * N === f[i] * M ? true : 'number of balls is wrong';
  },
};

export default {
  id: 'probability',
  name: 'הסתברות',
  grade: 'ז׳–ח׳',
  about: 'מחשבים מה הסיכוי שמאורע יקרה: מספר התוצאות המתאימות חלקי מספר כל התוצאות האפשריות',
  place: 'נושא חדש בתחום "מספרים": "סטטיסטיקה והסתברות" ← פרק שלישי, אחרי "ממוצע, חציון, שכיח וטווח"',
  lesson: [
    { t: 'מהי הסתברות?', items: [
      'הסתברות היא מספר שמתאר מה הסיכוי שמאורע יקרה.',
      'כשלכל התוצאות יש אותו סיכוי (קובייה הוגנת, כדורים זהים בשקית), ההסתברות היא מספר התוצאות המתאימות חלקי מספר כל התוצאות האפשריות.',
      { ex: 'בשקית [[3]] כדורים אדומים ו-[[5]] כדורים כחולים. מוציאים כדור בלי להסתכל. מה ההסתברות שהוא אדום?', fig2: { type: 'balls', balls: ['red', 'blue', 'blue', 'red', 'blue', 'blue', 'red', 'blue'] }, sol: ['מספר כל הכדורים: [[3 + 5 = 8]]', 'מספר הכדורים האדומים: [[3]]', 'ההסתברות: [[{3|8}]]'] },
    ] },
    { t: 'בין 0 ל-1', items: [
      'הסתברות היא תמיד מספר בין [[0]] ל-[[1]].',
      { list: ['מאורע בלתי אפשרי, שלא יכול לקרות: ההסתברות [[0]]. למשל, לקבל [[7]] בהטלת קובייה.', 'מאורע ודאי, שקורה תמיד: ההסתברות [[1]]. למשל, לקבל מספר קטן מ-[[7]] בהטלת קובייה.', 'ככל שההסתברות קרובה יותר ל-[[1]], הסיכוי שהמאורע יקרה גדול יותר.'] },
      { ex: 'מטילים קובייה הוגנת. מה ההסתברות לקבל מספר גדול מ-[[4]]?', sol: ['מספר כל התוצאות: [[6]]', 'התוצאות המתאימות: [[5, 6]]. יש [[2]] כאלה.', 'ההסתברות: [[{2|6} = {1|3}]]'] },
    ] },
    { t: 'הסתברות לפי ניסוי', items: [
      'לפעמים אי אפשר לדעת מראש מהן כל התוצאות (למשל, כשלא יודעים מה יש בשקית). אז עורכים ניסוי הרבה פעמים, ואומדים את ההסתברות לפי השכיחות היחסית.',
      { ex: 'הוציאו כדור משקית והחזירו אותו [[100]] פעמים. כדור ירוק יצא [[30]] פעמים. מה ההסתברות להוציא כדור ירוק, לפי הניסוי?', sol: ['השכיחות היחסית של ירוק: [[{30|100} = {3|10}]]', 'לכן ההסתברות היא בערך [[{3|10}]].'] },
      { note: 'טעות נפוצה: לחלק את מספר התוצאות המתאימות במספר התוצאות האחרות. מחלקים תמיד במספר כל התוצאות. עם [[3]] אדומים ו-[[5]] כחולים ההסתברות לאדום היא [[{3|8}]] ולא [[{3|5}]].' },
    ] },
  ],
  gens: [bag, numbers, spinner, certain, experiment],
};

/* node --test src/topics/proofs/texts.test.mjs
   Words of the proofs section: the reasons (spec §6.3) and every Hebrew text (spec §9), copied
   character for character; islands never glued to a Hebrew prefix; no emoji; no check words on buttons. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASONS, GROUPS, THEOREMS, CP, groupOf, isLaw, reasonInline } from './reasons.js';
import { T, tx, fill, LABELS, NEW_DRAFTS } from './texts.js';

test('reasons: the 14 ids and their exact chips', () => {
  assert.deepEqual(Object.keys(REASONS).sort(), ['alternate','altitude','asa','bisector','common-angle','common-side','cp-angles','cp-sides','given','median','midpoint','sas','sss','vertical']);
  assert.equal(REASONS.sas.short, 'צ.ז.צ');
  assert.equal(REASONS['cp-sides'].short, 'צלעות מתאימות במשולשים חופפים');
  assert.equal(REASONS.median.full, 'תיכון מחבר קודקוד עם אמצע הצלע שמולו.');
  assert.equal(REASONS.alternate.full, null);
  assert.ok(!Object.values(REASONS).some((r) => r.short === 'זוויות מתאימות בין ישרים מקבילים'));   // not in phase 1
  assert.ok(!Object.values(REASONS).some((r) => /ז\.ז\.צ|צ\.צ\.ז/.test(r.short)));
  assert.deepEqual(THEOREMS, ['sas', 'asa', 'sss']); assert.deepEqual(CP, ['cp-sides', 'cp-angles']);
});
test('groups: five, in order, every non-alternate reason in exactly one', () => {
  assert.deepEqual(GROUPS.map((g) => g.he), ['כתוב בשאלה','הגדרה','רואים בציור','משפט חפיפה','נובע מהחפיפה']);
  const all = GROUPS.flatMap((g) => g.reasons);
  assert.equal(new Set(all).size, 13); assert.equal(groupOf('alternate'), null); assert.equal(groupOf('vertical'), 'seen');
});
test('texts: exact spec sentences', () => {
  assert.equal(T['st.goalEarly'], 'זה מה שצריך להוכיח. אי אפשר להשתמש בו לפני שהוכחנו אותו.');
  assert.equal(T['rs.short'], 'הנימוק לא מתאים. נסו שוב.');
  assert.equal(T['ui.endClean'], 'מ.ש.ל. הוכחה נקייה.');
  assert.equal(T['rs.cong.sss2'], 'יש רק שני זוגות צלעות. במשפט צ.צ.צ צריך שלושה.');
  assert.equal(T['hint.common.2'], 'צלע תמיד שווה לעצמה.');
  assert.equal(LABELS.reason('congruence'), 'נימוק · משפט חפיפה'); assert.equal(LABELS.stmt('given'), 'טענה · נתון');
  assert.equal(LABELS.matching, 'התאמת קודקודים');
});
test('labels: every role has a statement and a reason label', () => {
  for (const r of ['given', 'given-more', 'given-words', 'vertical', 'common', 'congruence', 'conclusion', 'partner']) { assert.ok(LABELS.stmt(r).startsWith('טענה · ')); assert.ok(LABELS.reason(r).startsWith('נימוק · ')); }
  assert.equal(LABELS.stmt('vertical'), 'טענה · רואים בציור'); assert.equal(LABELS.reason('partner'), 'נימוק · מסקנה');
  assert.throws(() => LABELS.stmt('nope'));
});
test('hint keys: two rungs for each of the 9 roles', () => {
  for (const r of ['given', 'given-more', 'given-words', 'vertical', 'common', 'congruence', 'matching', 'conclusion', 'partner']) { assert.ok(T[`hint.${r}.1`], r); assert.ok(T[`hint.${r}.2`], r); }
});
test('tx: islands, and no Hebrew prefix glued to one', () => {
  assert.deepEqual(tx('st.congEarly', { n: '2' }).filter((p) => p.t === 'm').map((p) => p.v), ['2']);
  assert.throws(() => tx('no.such.key')); assert.throws(() => tx('st.congEarly', {}));
  assert.deepEqual(tx('lbl.done', { n: 7 }), [{ t: 'he', v: 'הוכחות שהשלמתם: 7' }]);
  assert.equal(fill('st.falseSeg', { x: 'AO', y: 'CO' }), 'מהנתון אי אפשר לדעת שהקטעים AO, CO שווים.');
  for (const k of Object.keys(T)) {
    assert.ok(!/[א-ת]-?\{[^{]/.test(T[k]), `glued prefix in ${k}`);          // "ל-{D}" or "ל{D}"
    if (k.startsWith('btn.')) assert.ok(!/בדוק|בדיקה|אשר|אישור|✓/.test(T[k]), `check word in ${k}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(T[k]), `emoji in ${k}`);
  }
});

/* Task 4 (spec 2026-11-23 §6.1): every reason carries the Ministry's full sentence and a kind. */
const MINISTRY = {
  sas: 'אם שתי צלעות במשולש אחד שוות לשתי צלעות במשולש אחר, וגם הזוויות הכלואות בין הצלעות שוות זו לזו, אז המשולשים חופפים (צלע-זווית-צלע).',
  asa: 'אם שתי זוויות במשולש אחד שוות לשתי זוויות במשולש אחר, וגם הצלעות הנמצאות בין הזוויות שוות זו לזו, אז המשולשים חופפים (זווית-צלע-זווית).',
  sss: 'אם שלוש צלעות במשולש אחד שוות לשלוש צלעות במשולש אחר אז שני המשולשים חופפים (צלע-צלע-צלע).',
  vertical: 'זוויות קדקודיות שוות זו לזו.',
};
test('reasons §6.1: the Ministry sentences, character for character', () => {
  for (const [id, s] of Object.entries(MINISTRY)) assert.equal(REASONS[id].full, s, id);
});
test('reasons §6.1: the other full texts are today\'s wording as whole sentences', () => {
  assert.deepEqual(Object.fromEntries(['given', 'bisector', 'median', 'midpoint', 'altitude', 'cp-sides', 'cp-angles', 'common-side', 'common-angle', 'alternate'].map((id) => [id, REASONS[id].full])), {
    given: 'נתון',
    bisector: 'חוצה זווית מחלק את הזווית לשתי זוויות שוות.',
    median: 'תיכון מחבר קודקוד עם אמצע הצלע שמולו.',
    midpoint: 'אמצע קטע מחלק אותו לשני קטעים שווים.',
    altitude: 'גובה מאונך לצלע.',
    'cp-sides': 'צלעות מתאימות במשולשים חופפים שוות.',
    'cp-angles': 'זוויות מתאימות במשולשים חופפים שוות.',
    'common-side': 'צלע משותפת לשני המשולשים.',
    'common-angle': 'זווית משותפת לשני המשולשים.',
    alternate: null,                                   // stays a wrong-answer chip until similarity makes it a real reason
  });
  for (const r of Object.values(REASONS)) if (r.full && r.id !== 'given') assert.ok(r.full.endsWith('.'), r.id);
  assert.ok(!Object.values(REASONS).some((r) => r.full && r.full.startsWith('משפט חפיפה')), 'the old "משפט חפיפה …" stand-ins are gone');
});
test('reasons §6.1: kinds, and isLaw = theorem or definition', () => {
  assert.deepEqual(Object.fromEntries(Object.values(REASONS).map((r) => [r.id, r.kind])), {
    given: 'given', 'common-side': 'rule', vertical: 'theorem', bisector: 'definition', median: 'definition', midpoint: 'definition',
    altitude: 'definition', sas: 'theorem', asa: 'theorem', sss: 'theorem', 'cp-sides': 'rule', 'cp-angles': 'rule', 'common-angle': 'rule', alternate: 'theorem',
  });
  assert.deepEqual(Object.keys(REASONS).filter(isLaw).sort(), ['alternate', 'altitude', 'asa', 'bisector', 'median', 'midpoint', 'sas', 'sss', 'vertical']);
  assert.equal(isLaw('nope'), false);
});
test('reasons: chips and Level-3 groups did not move (chips and the two-step pick depend on them)', () => {
  assert.deepEqual(Object.fromEntries(Object.values(REASONS).map((r) => [r.id, [r.short, r.group]])), {
    given: ['נתון', 'written'], 'common-side': ['צלע משותפת', 'seen'], vertical: ['זוויות קודקודיות', 'seen'],
    bisector: ['הגדרת חוצה זווית', 'definition'], median: ['הגדרת תיכון', 'definition'], midpoint: ['אמצע קטע', 'definition'],
    altitude: ['הגדרת גובה', 'definition'], sas: ['צ.ז.צ', 'theorem'], asa: ['ז.צ.ז', 'theorem'], sss: ['צ.צ.צ', 'theorem'],
    'cp-sides': ['צלעות מתאימות במשולשים חופפים', 'follows'], 'cp-angles': ['זוויות מתאימות במשולשים חופפים', 'follows'],
    'common-angle': ['זווית משותפת', 'seen'], alternate: ['זוויות מתחלפות בין ישרים מקבילים', null],
  });
});
test('reasons inside a sentence: no doubled period ("הנימוק: ….")', () => {
  for (const id of Object.keys(REASONS)) {
    const s = reasonInline(id);
    assert.ok(s && !s.endsWith('.'), id);
    for (const k of ['ui.filled', 'coach.reason']) assert.ok(!fill(k, { reason: s }).includes('..'), `${k} ${id}`);
  }
  assert.equal(reasonInline('sss'), MINISTRY.sss.slice(0, -1)); assert.equal(reasonInline('alternate'), REASONS.alternate.short);
});
test('every changed reason wording is on the review list', () => {
  for (const r of Object.values(REASONS)) if (r.full && r.id !== 'given') assert.ok(NEW_DRAFTS.includes(`reason.${r.id}`), r.id);
});
test('every undrafted text is declared', () => {
  for (const k of NEW_DRAFTS) assert.ok(k in T || (k.startsWith('reason.') && REASONS[k.slice(7)] && REASONS[k.slice(7)].full), k);
  for (const k of ['w.W1.why','w.W7.why','skill.W4','about.prove-congruence']) assert.ok(NEW_DRAFTS.includes(k), k);
});
test('Hebrew consistency (review M7): gershayim in abbreviations, one form of מ.ש.ל., one wording for a midpoint, W2 in the masculine', () => {
  for (const [k, v] of Object.entries(T)) {
    assert.ok(!/[א-ת]"[א-ת]/.test(v), `ASCII quote in an abbreviation: ${k}`);
    if (v.includes('מ.ש.ל')) assert.ok(!/מ\.ש\.ל(?!\.)/.test(v), `מ.ש.ל without its final dot: ${k}`);
    if (/אמצע/.test(v) && k.startsWith('gv.')) assert.match(v, /אמצע (הצלע|הקטע) /, k);
  }
  assert.equal(T['lbl.toProve'], 'צ״ל:'); assert.equal(T['btn.qed'], 'מ.ש.ל.');
  assert.ok(!('gv.mid' in T));
  assert.equal(T['w.W2'], 'ידוע, או רק נראה כך?'); assert.deepEqual([T['w.W2.known'], T['w.W2.looks']], ['ידוע', 'רק נראה כך']);
  for (const k of ['w.W2', 'w.W3', 'st.partner']) assert.ok(NEW_DRAFTS.includes(k), `${k} differs from the spec draft`);
  assert.equal(fill('st.partner', { p: 'A', q: 'E', place: T['lbl.place1'] }), 'האות A כתובה במקום הראשון במשולש הראשון, והאות E באותו מקום במשולש השני. לכן הקודקוד A מתאים לקודקוד E.');
});

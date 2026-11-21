/* Test-only problems (not shipped): the §10.1 X-SAS proof with the mockup coordinates, and one
   made-up over-determined proof (two valid theorems on different premises). */

const S = (x, y, mark) => ({ kind: 'seg', x, y, ...(mark ? { mark } : {}) });
const A = (v, r) => ({ v, r });
const G = (x, y, mark) => ({ kind: 'ang', x, y, ...(mark ? { mark } : {}) });

/** "AB and CD cut each other at O; AO = OB, CO = OD. Prove AC = BD." (type 4) */
export function xsas() {
  return {
    id: 'fixture-xsas', type: 'then-conclusion', template: '4-X-SAS-1', seed: 0, level: 2, variant: 'B',
    family: 'X', theorem: 'sas',
    text: [{ key: 'tx.X', vars: { s1: 'AB', s2: 'CD', p: 'O' } }],
    givenText: [{ facts: ['a'], form: 'eq' }, { facts: ['b'], form: 'eq' }],
    figure: {
      points: { A: [62, 40], B: [258, 156], C: [104, 170], D: [216, 26], O: [160, 98] },
      lines: [['A', 'O', 'B'], ['C', 'O', 'D']],
      segs: ['AO', 'OB', 'CO', 'OD', 'AC', 'BD'],
      angles: [A('O', ['A', 'C']), A('O', ['B', 'D']), A('A', ['O', 'C']), A('B', ['O', 'D']), A('C', ['O', 'A']), A('D', ['O', 'B'])],
      tris: [['A', 'O', 'C'], ['B', 'O', 'D']],
      motion: { kind: 'half-turn', about: 'O' },
    },
    facts: {
      a: S('AO', 'OB', { ticks: 1, color: 1 }),
      b: S('CO', 'OD', { ticks: 2, color: 2 }),
      c: G(A('O', ['A', 'C']), A('O', ['B', 'D']), { arcs: 1, color: 3 }),
      cong: { kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] },
      goal: S('AC', 'BD', { ticks: 3, color: 1 }),
      e1: G(A('A', ['O', 'C']), A('B', ['O', 'D']), { arcs: 2, color: 2 }),
      e2: G(A('C', ['O', 'A']), A('D', ['O', 'B']), { arcs: 3, color: 3 }),
    },
    just: {
      a: [{ reasons: ['given'], needs: [] }],
      b: [{ reasons: ['given'], needs: [] }],
      c: [{ reasons: ['vertical'], needs: [] }],
      cong: [{ reasons: ['sas'], needs: ['a', 'c', 'b'] }],
      goal: [{ reasons: ['cp-sides'], needs: ['cong'] }],
      e1: [{ reasons: ['cp-angles'], needs: ['cong'] }],
      e2: [{ reasons: ['cp-angles'], needs: ['cong'] }],
    },
    given: ['a', 'b'], target: 'goal', cong: 'cong', consequences: ['goal', 'e1', 'e2'],
    canon: ['a', 'c', 'b', 'cong', 'goal'],
    roles: { a: 'given', b: 'given', c: 'vertical', cong: 'congruence', goal: 'conclusion' },
    tiles: { wrong: [] }, traps: {},
  };
}

/** A kite with more given than needed: △ABC ≅ △ADC by צ.צ.צ (a, b, k) or by צ.ז.צ (a, g, k). */
export function over() {
  return {
    id: 'fixture-over', type: 'prove-congruence', template: 'over', seed: 0, level: 2, variant: 'B',
    family: 'K', theorem: 'sss',
    text: [], givenText: [{ facts: ['a'], form: 'eq' }, { facts: ['b'], form: 'eq' }, { facts: ['g'], form: 'eq' }],
    figure: {
      points: { A: [0, 0], C: [10, 0], B: [3, 4], D: [3, -4] },
      lines: [],
      segs: ['AB', 'AD', 'CB', 'CD', 'AC'],
      angles: [A('A', ['B', 'C']), A('A', ['D', 'C']), A('C', ['B', 'A']), A('C', ['D', 'A']), A('B', ['A', 'C']), A('D', ['A', 'C'])],
      tris: [['A', 'B', 'C'], ['A', 'D', 'C']],
      motion: { kind: 'flip', axis: ['A', 'C'] },
    },
    facts: {
      a: S('AB', 'AD', { ticks: 1, color: 1 }),
      b: S('CB', 'CD', { ticks: 2, color: 2 }),
      g: G(A('A', ['B', 'C']), A('A', ['D', 'C']), { arcs: 1, color: 3 }),
      k: S('AC', 'AC', { ticks: 3, color: 3 }),
      cong: { kind: 'cong', map: [['A', 'A'], ['B', 'D'], ['C', 'C']] },
    },
    just: {
      a: [{ reasons: ['given'], needs: [] }],
      b: [{ reasons: ['given'], needs: [] }],
      g: [{ reasons: ['given'], needs: [] }],
      k: [{ reasons: ['common-side'], needs: [] }],
      cong: [{ reasons: ['sss'], needs: ['a', 'b', 'k'] }, { reasons: ['sas'], needs: ['a', 'g', 'k'] }],
    },
    given: ['a', 'b', 'g'], target: 'cong', cong: 'cong', consequences: [],
    canon: ['a', 'b', 'k', 'cong'],
    roles: { a: 'given', b: 'given', g: 'given', k: 'common', cong: 'congruence' },
    tiles: { wrong: [] }, traps: {},
  };
}

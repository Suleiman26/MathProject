/* Colours shared by all drawings of the "חדש" module. */
export const INK = '#1c1b19', MUTED = '#8a877f', LINE = '#e7e5e0';
export const PALETTE = { a: 'var(--a-600)', blue: '#2563eb', orange: '#ea580c', green: '#16a34a', violet: '#7c3aed', pink: '#db2777', gray: '#8a877f', red: '#dc2626', yellow: '#eab308' };
/** a palette name (or any CSS colour) → a CSS colour */
export const col = (c, d = 'a') => PALETTE[c] || c || PALETTE[d];

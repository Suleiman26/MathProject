/* Duels: two crossed swords, solid and crisp (home tile, profile record).
   Drawn for a dark "arena" disc: blades light in the student's colour, guards and
   grips in the colour itself, each sword outlined in the disc colour so the front
   one cuts cleanly across the back one. Each sword is a group (.b1 / .b2) so CSS
   can swing them in to meet once; .sp is the spark where they cross.
   Needs the student's --a-* colours on a parent (data-topic). */
const BLADE = { fill: "color-mix(in srgb, var(--a-200, #c4b5fd) 65%, #fff)" };
const HILT = { fill: "var(--a-300, #a78bfa)" };

function Sword() {
  // one sword standing up, its middle on the centre of the 48 box; rotated by the parent
  return (
    <>
      <path d="M24 2l3 4.5V33h-6V6.5z" style={BLADE} />
      <path d="M24 8.5V30" stroke="var(--a-300, #a78bfa)" strokeWidth="1.3" strokeLinecap="round" opacity=".55" />
      <rect x="15" y="32.5" width="18" height="4" rx="2" style={HILT} />
      <rect x="22" y="36.5" width="4" height="6.5" rx="1.4" style={HILT} />
      <circle cx="24" cy="45" r="2.6" style={HILT} />
    </>
  );
}

export function DuelMark({ className = "" }) {
  return (
    <svg className={"duel-mark " + className} viewBox="0 0 48 48" aria-hidden="true" stroke="#0b1020" strokeWidth="1.6" paintOrder="stroke" strokeLinejoin="round">
      <g transform="rotate(-45 24 24)"><g className="b1"><Sword /></g></g>
      <g transform="rotate(45 24 24)"><g className="b2"><Sword /></g></g>
      <circle className="sp" cx="24" cy="24" r="4.5" fill="#fff" stroke="none" opacity="0" />
    </svg>
  );
}

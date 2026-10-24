/* Topic icons, shared by the home page and the admin. 24×24, currentColor. */
window.MP_ICONS = {
  equation:     { label: "משוואה", svg: '<text x="12" y="17" text-anchor="middle" font-size="15" fill="currentColor" font-weight="600">x=</text>' },
  fraction:     { label: "שבר", svg: '<text x="12" y="10" text-anchor="middle" font-size="10" fill="currentColor" font-weight="600">1</text><path d="M6 12.5h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><text x="12" y="22" text-anchor="middle" font-size="10" fill="currentColor" font-weight="600">x</text>' },
  inequality:   { label: "אי-שוויון", svg: '<text x="12" y="17" text-anchor="middle" font-size="15" fill="currentColor" font-weight="600">x&lt;</text>' },
  square:       { label: "ריבוע", svg: '<text x="11" y="18" text-anchor="middle" font-size="16" fill="currentColor" font-weight="600">x</text><text x="18" y="10" text-anchor="middle" font-size="9" fill="currentColor" font-weight="600">2</text>' },
  line:         { label: "ישר", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V4M4 20h16" opacity=".45"/><path d="M6 17L19 6"/></g><circle cx="10" cy="13.6" r="1.6" fill="currentColor"/>' },
  parabola:     { label: "פרבולה", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 20h18" opacity=".45"/><path d="M5 5c2 9 4.5 12 7 12s5-3 7-12"/></g><circle cx="12" cy="17" r="1.6" fill="currentColor"/>' },
  intersection: { label: "חיתוך", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 18L20 6"/><path d="M4 7c3 8 6 11 9 10s5-5 7-9" opacity=".55"/></g><circle cx="14.2" cy="9.9" r="1.9" fill="currentColor"/>' },
  numberline:   { label: "ציר מספרים", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 15h18"/><path d="M6 13v4M12 12v6M18 13v4" opacity=".55"/></g><text x="12" y="9" text-anchor="middle" font-size="9" fill="currentColor" font-weight="600">±</text>' },
  percent:      { label: "אחוז", svg: '<text x="12" y="18" text-anchor="middle" font-size="16" fill="currentColor" font-weight="600">%</text>' },
  root:         { label: "שורש", svg: '<path d="M3 13l2.5-1.5L9 19l4-14h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="17" y="17" text-anchor="middle" font-size="9" fill="currentColor" font-weight="600">x</text>' },
  parallel:     { label: "מקבילים", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8h18M3 16h18" opacity=".55"/><path d="M8 21L16 3"/></g>' },
  triangle:     { label: "משולש", svg: '<path d="M12 4L21 19H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' },
  quad:         { label: "מרובע", svg: '<path d="M7 5h14l-4 14H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' },
  right:        { label: "ישר-זווית", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20V5l15 15z"/><path d="M4 16h4v4" stroke-width="1.4" opacity=".6"/></g>' },
  similar:      { label: "דמיון", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 20L8 11l5.5 9z" opacity=".55"/><path d="M11 20l5.5-15L22 20z"/></g>' },
  circle:       { label: "מעגל", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 12l6-6" opacity=".6"/></g><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' },
  cube:         { label: "גוף", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9" opacity=".6"/></g>' },
  star:         { label: "כוכב", svg: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' },
  book:         { label: "ספר", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 23H20v-5" opacity=".6"/></g>' },
  chart:        { label: "נתונים", svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20h16" opacity=".45"/><path d="M7 17v-5M12 17V7M17 17v-8"/></g>' }
};
window.MP_ICON = function (key) {
  var i = window.MP_ICONS[key] || window.MP_ICONS.equation;
  return '<svg viewBox="0 0 24 24" aria-hidden="true" style="direction:ltr">' + i.svg + "</svg>";
};

'use client';
/* Who is writing on the fixes board (shared by the board and בקרת תוכן). The name stays on this device. */
import { useEffect, useState } from "react";

export const PEOPLE = ["סולימאן", "עבד"];

/** [name, setName]: null while reading, "" when nobody was chosen yet */
export function useName() {
  const [name, setName] = useState(null);
  useEffect(() => { try { setName(localStorage.getItem("mp:fix-name") || ""); } catch { setName(""); } }, []);
  const set = (n) => { setName(n); try { localStorage.setItem("mp:fix-name", n); } catch {} };
  return [name, set];
}

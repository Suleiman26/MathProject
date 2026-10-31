import type { Metadata } from "next";
import Contact from "@/legal/Contact";

export const metadata: Metadata = { title: "יצירת קשר · מתמטיקה חט״ב" };

export default function Page() {
  return <Contact />;
}

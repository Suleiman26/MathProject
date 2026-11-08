import type { Metadata } from "next";
import "@/styles/hero.css";
import "@/styles/duel.css";
import Hub from "@/duel/Hub";

export const metadata: Metadata = { title: "דו-קרב · מתמטיקה חט״ב", robots: { index: false } };

export default function Page() {
  return <Hub />;
}

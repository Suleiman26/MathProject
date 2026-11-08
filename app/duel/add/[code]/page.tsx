import type { Metadata } from "next";
import "@/styles/hero.css";
import "@/styles/duel.css";
import { AddByLink } from "@/duel/Hub";

export const metadata: Metadata = { title: "הזמנה לדו-קרב · מתמטיקה חט״ב", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <AddByLink code={code} />;
}

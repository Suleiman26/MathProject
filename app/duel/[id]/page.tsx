import type { Metadata } from "next";
import "@/styles/duel.css";
import "@/styles/duel-arena.css";
import Play from "@/duel/Play";

export const metadata: Metadata = { title: "דו-קרב · מתמטיקה חט״ב", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Play id={id} />;
}

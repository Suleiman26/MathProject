import type { Metadata } from "next";
import TopicDetail from "@/account/TopicDetail";
import { TOPICS } from "@/home/catalog";

export const metadata: Metadata = { title: "ההתקדמות שלי בנושא · מתמטיקה חט״ב", robots: { index: false } };

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export default async function Page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return <TopicDetail slug={topic} />;
}

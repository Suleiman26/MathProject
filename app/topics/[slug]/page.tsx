import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOPICS } from "@/topics/registry";
import TopicView from "@/components/TopicView";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(TOPICS).map((slug) => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = (TOPICS as Record<string, { title: string }>)[slug];
  return { title: t ? t.title : "מתמטיקה חט״ב" };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  if (!(slug in TOPICS)) notFound();
  return <TopicView slug={slug} />;
}

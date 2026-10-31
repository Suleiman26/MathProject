import type { Metadata } from "next";
import { Accessibility } from "@/legal/Legal";

export const metadata: Metadata = { title: "הצהרת נגישות · מתמטיקה חט״ב" };

export default function Page() {
  return <Accessibility />;
}

import type { Metadata } from "next";
import { Privacy } from "@/legal/Legal";

export const metadata: Metadata = { title: "מדיניות פרטיות · מתמטיקה חט״ב" };

export default function Page() {
  return <Privacy />;
}

import type { Metadata } from "next";
import { Terms } from "@/legal/Legal";

export const metadata: Metadata = { title: "תנאי שימוש · מתמטיקה חט״ב" };

export default function Page() {
  return <Terms />;
}

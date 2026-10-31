import type { Metadata } from "next";
import Profile from "@/account/Profile";

export const metadata: Metadata = { title: "הפרופיל שלי · מתמטיקה חט״ב", robots: { index: false } };

export default function Page() {
  return <Profile />;
}

import type { Metadata } from "next";
import Signup from "@/account/Signup";

export const metadata: Metadata = { title: "פתיחת חשבון · מתמטיקה חט״ב", robots: { index: false } };

export default function Page() {
  return <Signup />;
}

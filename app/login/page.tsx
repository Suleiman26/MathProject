import type { Metadata } from "next";
import Login from "@/account/Login";

export const metadata: Metadata = { title: "התחברות · מתמטיקה חט״ב", robots: { index: false } };

export default function Page() {
  return <Login />;
}

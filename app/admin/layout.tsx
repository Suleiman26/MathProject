import type { Metadata } from "next";
import "@/admin/admin.css";
import AdminShell from "@/admin/AdminShell";

export const metadata: Metadata = { title: "ניהול · מתמטיקה חט״ב", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm adm-root"><AdminShell>{children}</AdminShell></div>;
}

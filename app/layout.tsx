import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "@/styles/mp.css";
import "@/styles/globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-rubik", display: "swap" });

export const metadata: Metadata = {
  title: "מתמטיקה חט״ב – תרגול",
  description: "תרגול מתמטיקה לחטיבת הביניים, שלב אחר שלב.",
};
export const viewport: Viewport = { themeColor: "#f5f5f2", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

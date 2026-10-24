import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "@/styles/mp.css";
import "@/styles/globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-rubik", display: "swap" });

const SITE = "https://mathproject-gamma.vercel.app";
const TITLE = "מתמטיקה חט״ב – תרגול";
const DESC = "תרגול מתמטיקה לחטיבת הביניים, שלב אחר שלב.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  applicationName: "מתמטיקה חט״ב",
  appleWebApp: { capable: true, title: "מתמטיקה", statusBarStyle: "default" },
  openGraph: {
    type: "website", locale: "he_IL", url: "/", siteName: "מתמטיקה חט״ב", title: TITLE, description: DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "מתמטיקה חט״ב" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};
export const viewport: Viewport = { themeColor: "#f5f5f2", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

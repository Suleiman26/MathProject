import type { Metadata } from "next";
import Link from "next/link";

/* A link that leads nowhere (old or mistyped): a friendly way back. */
export const metadata: Metadata = { title: "הדף לא נמצא · מתמטיקה חט״ב", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="nf">
      <div className="nf-card">
        <span className="nf-num" aria-hidden="true">404</span>
        <h1>הדף הזה לא נמצא</h1>
        <p>אולי הקישור ישן או שנפלה בו טעות. כל הנושאים מחכים בדף הבית.</p>
        <Link href="/" className="nf-go">לכל הנושאים</Link>
      </div>
    </main>
  );
}

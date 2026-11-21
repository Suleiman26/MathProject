'use client';
/* The two tabs inside "תיקונים": בקרת תוכן (the panel) · כל התיקונים (the board). Same idea as the duels tabs. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../../review.css";

export function FixTabs({ open, className = "" }) {
  const path = usePathname();
  const tabs = [["/admin/review", "בקרת תוכן", null], ["/admin/fixes", "כל התיקונים", open]];
  return (
    <nav className={"cpl-tabs " + className} aria-label="תיקונים">
      {tabs.map(([href, label, n]) => (
        <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>
          {label}{n ? <span className="cpl-tabs-n">{n}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

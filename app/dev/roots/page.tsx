/* Local-only preview of the shared root sign (fixes board #65): every way the site uses it.
   Shows "not found" on the live site (open locally and on preview links). */
import { notFound } from "next/navigation";
import "@/styles/duel-arena.css";
import RootLab from "@/dev/RootLab";

export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <RootLab />;
}

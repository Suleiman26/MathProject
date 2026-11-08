/* Local-only preview of the duel hub with sample data.
   ?s=hub|sheet|waiting|empty|guest|soon · arena: invite|accepted|faceoff|arena|hot|lastq|locked|waiting|finishing|failed|done  &c=<my colour>
   Shows "not found" on the live site (open locally and on preview links). */
import { notFound } from "next/navigation";
import "@/styles/hero.css";
import "@/styles/duel.css";
import "@/styles/duel-arena.css";
import DuelLab from "@/dev/DuelLab";

export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <DuelLab />;
}

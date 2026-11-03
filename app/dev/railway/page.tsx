/* Local-only preview of the signed-in railway with sample students.
   Shows "not found" on the live site (open on preview links). */
import { notFound } from "next/navigation";
import "@/styles/home.css";
import "@/styles/journey.css";
import "@/styles/hero.css";
import RailwayLab from "@/dev/RailwayLab";

export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();   // open locally and on preview links, never on the live site
  return <RailwayLab />;
}

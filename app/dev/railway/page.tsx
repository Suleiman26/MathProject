/* Local-only preview of the signed-in railway with sample students.
   Shows "not found" on the live site. */
import { notFound } from "next/navigation";
import "@/styles/home.css";
import "@/styles/journey.css";
import RailwayLab from "@/dev/RailwayLab";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <RailwayLab />;
}

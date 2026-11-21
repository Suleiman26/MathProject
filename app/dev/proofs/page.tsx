/* Local-only lab for the proofs section ("הוכחות"): every figure, level and state.
   Shows "not found" on the live site (open locally and on preview links). */
import { notFound } from "next/navigation";
import ProofsLab from "@/dev/ProofsLab";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <ProofsLab />;
}

/* Local-only: compare 3D avatar styles (characters + a pet on the shoulder).
   Models live in public/dev-avatars (not in git). Shows "not found" live. */
import { notFound } from "next/navigation";
import AvatarLab from "@/dev/AvatarLab";

export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();   // open locally and on preview links, never on the live site
  return <AvatarLab />;
}

import { Suspense } from "react";
import "@/styles/duel-arena.css";
import DuelQuestions from "@/admin/pages/DuelQuestions";

export default function Page() {
  return <Suspense><DuelQuestions /></Suspense>;
}

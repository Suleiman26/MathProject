'use client';
/* The "חדש" module (fixes board #84, Sulaiman): everything the Ministry of Education
   teaching plans for grades 7–9 (תשפ"ז) ask for that the site did not have yet.
   One chapter per missing subject; each chapter shows where it is recommended to live
   among the existing topics. Since 2026-11-21 only the chapters still waiting for a place
   are here (./placed.js lists where the others went).
   Chapters: ./chapters/ · page: ./Module.jsx · screen: ./Engine.jsx · maths: ./core.js */
import React from 'react';
import CHAPTERS from './chapters/index';
import ModuleApp from './Module';

export default function App() {
  return <ModuleApp title="חדש" sub="נושאים מתוכנית הלימודים · כיתות ז׳–ט׳" chapters={CHAPTERS} staff />;
}

'use client';
/* The topic "סטטיסטיקה והסתברות" (fixes board #84, Sulaiman 2026-11-21: "create a new module of
   statistics and probability and put all the relevant chapters there, in the order you suggested").
   Built on the engine of the "חדש" module (src/topics/new/: Module.jsx, Engine.jsx, core.js). */
import React from 'react';
import CHAPTERS from './chapters';
import ModuleApp from '../new/Module';

export default function App() {
  return <ModuleApp title="סטטיסטיקה והסתברות" sub="כיתות ז׳–ח׳" chapters={CHAPTERS} />;
}

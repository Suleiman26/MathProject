'use client';
/* The topic "מערכת משוואות" (fixes board #84): the chapter of the "חדש" module, as its own topic.
   Built on the engine of the "חדש" module (src/topics/new/: Module.jsx, Engine.jsx, core.js). */
import React from 'react';
import CHAPTERS from './chapters';
import ModuleApp from '../new/Module';

export default function App() {
  return <ModuleApp title="מערכת משוואות" sub="כיתה ח׳" chapters={CHAPTERS} />;
}

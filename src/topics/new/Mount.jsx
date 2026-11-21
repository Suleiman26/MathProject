'use client';
/* One engine chapter (board #84) mounted inside another topic, as one of its chapters:
   Sulaiman, 2026-11-21, "insert the new algebra chapters at the places you suggested".
   The host topic imports the chapter's data file and renders <NewChapter ch={…} /> for that chapter
   button; the chapter brings its own CSS (./engine-css.js, scoped to .nw), so the host's styles stay
   untouched. Where each chapter lives: ./placed.js */
import React from 'react';
import Chapter from './Engine';
import { MOUNT_CSS } from './engine-css.js';

export default function NewChapter({ ch }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MOUNT_CSS }} />
      <Chapter ch={ch} key={ch.id} />
    </>
  );
}

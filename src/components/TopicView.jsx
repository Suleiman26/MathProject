'use client';
/* Opens one topic: its own CSS, the top bar, and Sulaiman's code inside #root.
   The topic code runs only in the browser, exactly like in the HTML version. */
import { useEffect, useState } from "react";
import { TOPICS, LOADERS, STYLES } from "@/topics/registry";
import { initRuntime } from "@/lib/mp-runtime";
import TopBar from "./TopBar";
import Keypad from "./Keypad";

export default function TopicView({ slug }) {
  const meta = TOPICS[slug];
  const [loaded, setLoaded] = useState(null); // { Topic, css }

  useEffect(() => {
    let alive = true;
    initRuntime();
    const html = document.documentElement;
    html.dataset.topic = meta.topic;
    html.dataset.page = slug;
    Promise.all([LOADERS[slug](), STYLES[slug]()]).then(([m, s]) => {
      if (alive) setLoaded({ Topic: m.default, css: s.default });
    });
    const t = setTimeout(() => window.MP && window.MP.view(), 1800);
    return () => { alive = false; clearTimeout(t); delete html.dataset.topic; delete html.dataset.page; };
  }, [slug, meta.topic]);

  const Topic = loaded && loaded.Topic;
  return (
    <>
      {loaded && <style dangerouslySetInnerHTML={{ __html: loaded.css }} />}
      <TopBar title={meta.title.split(/\s[—–-]\s/)[0]} />
      <div id="root">{Topic ? <Topic /> : <div className="mp-boot" aria-hidden="true"><span /></div>}</div>
      <Keypad page={slug} />
    </>
  );
}

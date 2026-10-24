import type { MetadataRoute } from "next";

/* Lets students "Add to Home Screen" with the app's own name and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מתמטיקה חט״ב – תרגול",
    short_name: "מתמטיקה",
    description: "תרגול מתמטיקה לחטיבת הביניים, שלב אחר שלב.",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f2",
    theme_color: "#f5f5f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

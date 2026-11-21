import type { NextConfig } from "next";

const TOPICS = [
  "angles-parallel", "circle", "directed-numbers", "equation-solver", "equations-advanced",
  "inequalities", "intersection", "linear-function", "parabola-practice", "powers-roots",
  "pythagoras", "quadratic-solver", "quadrilaterals", "ratio-percent", "similar-triangles",
  "solids3d", "triangles",
];

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  // The topic code was written for React without Strict Mode; keep its behaviour identical.
  reactStrictMode: false,
  async redirects() {
    return [
      // old addresses keep working (links shared before the move to Next.js)
      ...TOPICS.map((t) => ({ source: `/${t}.html`, destination: `/topics/${t}`, permanent: false })),
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/admin.html", destination: "/admin", permanent: false },
      { source: "/project-hub.html", destination: "/classic/project-hub.html", permanent: false },
      { source: "/classic", destination: "/classic/index.html", permanent: false },
    ];
  },
  async headers() {
    return [
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Only our own pages may frame the site: the admin's content-review panel shows topic pages in a
      // same-origin iframe; every other site is refused (clickjacking). Nothing else frames the site today.
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
    ];
  },
};

export default nextConfig;

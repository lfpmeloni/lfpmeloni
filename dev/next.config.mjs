import fs from "node:fs";
import path from "node:path";

/** Canonical URL of every .md file and folder, mirroring toRoute() in lib/content.ts. */
function canonicalRoutes(dir = path.join(process.cwd(), "src"), base = []) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) {
      const folder = [...base, e.name.toUpperCase()];
      return ["/" + folder.join("/"), ...canonicalRoutes(path.join(dir, e.name), folder)];
    }
    return e.name.endsWith(".md") ? ["/" + [...base, e.name].join("/")] : [];
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Baked into middleware.ts at build time, which can't read the filesystem at the edge.
  env: { CANONICAL_ROUTES: JSON.stringify(canonicalRoutes()) },
};

export default nextConfig;

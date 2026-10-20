import type { MetadataRoute } from "next";
import { getLastModified, getPublicDocs } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = getPublicDocs();
  const dirs = [...new Set(docs.flatMap((d) => (d.dir ? [d.dir] : [])))];
  const home = docs.find((d) => d.route === "/README.md");
  return [
    { url: `${SITE_URL}/`, lastModified: home && getLastModified(home), priority: 1 },
    ...dirs.map((dir) => ({ url: `${SITE_URL}/${dir}`, priority: 0.8 })),
    ...docs
      .filter((d) => d.route !== "/README.md")
      .map((d) => ({ url: `${SITE_URL}${d.route}`, lastModified: getLastModified(d), priority: 0.7 })),
  ];
}

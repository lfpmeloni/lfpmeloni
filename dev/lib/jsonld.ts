import { getDescription, type Doc } from "./content";
import { EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

/** schema.org structured data, so search engines and AI answers know who and what each page is about. */

const PERSON_ID = `${SITE_URL}/#person`;

const SAME_AS = ["https://github.com/lfpmeloni", "https://www.linkedin.com/in/lfpmeloni"];

const person = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Felipe Meloni",
  jobTitle: "AI & Software Engineer",
  url: SITE_URL,
  email: `mailto:${EMAIL}`,
  sameAs: SAME_AS,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Karlsruhe",
    addressRegion: "Baden-Württemberg",
    addressCountry: "DE",
  },
  knowsAbout: [
    "Software engineering",
    "Applied AI",
    "LLM agents",
    "Model Context Protocol",
    "Python",
    "TypeScript",
    "Next.js",
    "Full-stack product development",
  ],
};

/** Site-wide: who the site belongs to. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": PERSON_ID },
      },
    ],
  };
}

/** Per page: the homepage is a profile, project pages are creative works by the same person. */
export function docJsonLd(doc: Doc, { home = false } = {}) {
  const url = home || doc.route === "/README.md" ? `${SITE_URL}/` : `${SITE_URL}${doc.route}`;
  const description = getDescription(doc.source);

  if (home || doc.route === "/README.md") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      name: "Felipe Meloni",
      description: SITE_DESCRIPTION,
      mainEntity: { "@id": PERSON_ID },
    };
  }

  if (doc.dir === "PORTFOLIO") {
    const repo = /\[github\.com\/([^\]]+)\]/.exec(doc.source)?.[1];
    return {
      "@context": "https://schema.org",
      "@type": repo ? "SoftwareSourceCode" : "CreativeWork",
      url,
      name: doc.name.replace(/\.md$/, ""),
      description,
      author: { "@id": PERSON_ID },
      inLanguage: "en",
      ...(repo ? { codeRepository: `https://github.com/${repo}` } : {}),
    };
  }

  if (doc.name === "SERVICES.md" || doc.name === "LEISTUNGEN.md") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      url,
      name: "Felipe Meloni",
      description,
      email: EMAIL,
      founder: { "@id": PERSON_ID },
      address: person.address,
      areaServed: ["Karlsruhe", "Bruchsal", "Mannheim", "Baden-Württemberg"],
      inLanguage: doc.name === "LEISTUNGEN.md" ? "de" : "en",
    };
  }

  return null;
}

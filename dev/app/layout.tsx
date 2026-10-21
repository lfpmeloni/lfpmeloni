import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import JsonLd from "@/components/JsonLd";
import Shell from "@/components/Shell";
import Track from "@/components/Track";
import { getFootnoteDocs, getTree } from "@/lib/content";
import { siteJsonLd } from "@/lib/jsonld";
import { INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Felipe Meloni",
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: "Felipe Meloni", url: SITE_URL }],
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1F1F1F" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

/** Runs before paint so the saved or system theme applies without a flash. */
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const footnotes = getFootnoteDocs().map((d) => ({ name: d.name, route: d.route }));
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link
          rel="preload"
          href="/fonts/HackNerdFontMono-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Shell tree={getTree()} footnotes={footnotes}>
          {children}
        </Shell>
        <JsonLd data={siteJsonLd()} />
        <Track />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

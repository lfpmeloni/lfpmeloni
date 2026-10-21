import { ImageResponse } from "next/og";
import { OG_IMAGE } from "@/lib/site";

export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

/** One social card for the whole site, in the VS Code Dark Modern palette. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#1F1F1F",
          color: "#CCCCCC",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#6E7681", marginBottom: 36 }}>
          lfpmeloni.dev/<span style={{ color: "#569CD6" }}>README.md</span>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: "#FFFFFF" }}>
          <span style={{ color: "#569CD6", marginRight: 28 }}>#</span>Felipe Meloni
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 28, color: "#6A9955" }}>
          <span style={{ color: "#6E7681", marginRight: 24 }}>&gt;</span>Ask me to build anything.
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: 56, color: "#DCDCAA" }}>
          AI & Software Engineer | Full-Stack Product Development
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** The 1200x630 card shown when a link is shared. Name and place only: no figures, so nothing here can go stale. */
export function ogCard(title: string, subtitle: string): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #0f2a3d 0%, #1d5a7a 100%)", color: "white" }}>
        <div style={{ fontSize: 30, opacity: 0.85 }}>Dubai building intelligence</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 28 ? 68 : 84, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 36, marginTop: 20, opacity: 0.9 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.75 }}>Prices, rents and yields from Dubai Land Department open data</div>
      </div>
    ),
    OG_SIZE,
  );
}

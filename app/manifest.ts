import type { MetadataRoute } from "next";

/**
 * PWA manifest. Served by Next at /manifest.webmanifest.
 * Icons are the single SVG source; add raster sizes here if a store requires them.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bless Writes",
    short_name: "Bless Writes",
    description:
      "Books by Bless Laweh Koranteng. Read a free excerpt, then continue in the full edition.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f1",
    theme_color: "#3a6049",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

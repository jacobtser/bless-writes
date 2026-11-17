import type { MetadataRoute } from "next";

/**
 * PWA manifest. Served by Next at /manifest.webmanifest.
 *
 * The PNG icons in /public/icons are generated from public/icon.svg (the
 * maskable pair uses a full-bleed pine background so Android can crop it to
 * any launcher shape). `id` pins the app identity so future start_url changes
 * do not create a second installed app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bless Writes",
    short_name: "Bless Writes",
    description:
      "Books by Bless Laweh Koranteng. Read a free excerpt, then continue in the full edition.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Re-tapping the installed icon resumes the open app instead of opening a
    // second window on top of it. Browsers that don't know this fall back to
    // their normal launch behaviour.
    launch_handler: { client_mode: ["focus-existing", "auto"] },
    background_color: "#faf7f1",
    theme_color: "#3a6049",
    lang: "en",
    dir: "ltr",
    categories: ["books", "education"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Browse the books",
        short_name: "Books",
        description: "Go straight to the shelf",
        url: "/#books",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Your library",
        short_name: "Library",
        description: "Open the books you own",
        url: "/library",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}

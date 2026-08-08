import type { MetadataRoute } from "next";

/** Next serves this at /manifest.webmanifest and links it automatically. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeLedger",
    short_name: "LifeLedger",
    description: "Two years of your money, in twenty minutes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#12301F",
    theme_color: "#12301F",
    orientation: "portrait",
    categories: ["education", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

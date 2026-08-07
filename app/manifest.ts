import type { MetadataRoute } from "next";

/** Next serves this at /manifest.webmanifest and links it automatically. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Compound",
    short_name: "Compound",
    description: "Two years of your money, in twenty minutes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0F1D1B",
    theme_color: "#0F1D1B",
    orientation: "portrait",
    categories: ["education", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

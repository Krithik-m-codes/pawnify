import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pawnify.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/open-source",
          "/docs",
          "/privacy",
          "/terms",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/dashboard",
          "/admin",
          "/loans",
          "/customers",
          "/followups",
          "/reports",
          "/profile",
          "/api",
          "/platform-admin",
        ],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/llms.txt", "/llms-full.txt", "/open-source", "/pricing", "/docs"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

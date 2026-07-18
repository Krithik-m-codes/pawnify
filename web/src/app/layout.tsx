import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ReduxProvider } from "@/lib/redux/provider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#060a14" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://pawnify.cloud"),
  title: {
    default: "Pawnify — The Modern Cloud & Open-Source Asset Lending Operating System",
    template: "%s | Pawnify",
  },
  description:
    "Production-grade, multi-branch collateral finance platform for pawn shops and asset lenders. Issue loans against 24K Gold, Silver, Watches, and Fine Art with live spot rates, automated LTV capping, 60-second KYC, and atomic payment waterfalls. Free self-hosted under BSL/MIT or instant Cloud SaaS.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  keywords: [
    "pawn shop software",
    "asset-backed lending",
    "pawn broker CRM",
    "open source loan management",
    "gold loan software",
    "silver loan management",
    "collateral valuation calculator",
    "multi-branch pawn system",
    "KYC onboarding automation",
    "LTV simulator",
    "financial operating system",
    "self-hosted pawn software",
  ],
  authors: [{ name: "Pawnify Open Source & Cloud Team" }],
  creator: "Pawnify Cloud Inc.",
  publisher: "Pawnify",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["en_IN", "en_GB", "en_AE", "en_SG"],
    siteName: "Pawnify — Asset Lending Operating System",
    title: "Pawnify — The Modern Cloud & Open-Source Asset Lending Platform",
    description:
      "Transform your pawn shop or lending institution. Live spot rate feeds, multi-branch staff controls, automated interest calculations, and 60-second KYC workflows.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Pawnify Asset Lending Cloud Dashboard & Valuation Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pawnify — Modern Asset-Backed Lending Platform",
    description:
      "Replace legacy Windows 95 pawn software. Live gold spot rates, exact LTV capping, multi-branch employee controls, and automated repayment schedules.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLdStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Pawnify",
      "operatingSystem": "Web, Cloud, Windows, Linux, macOS",
      "applicationCategory": "BusinessApplication, FinanceApplication",
      "description":
        "Open-source and cloud SaaS operating system for pawn broking networks, asset-backed lending, collateral audit tracking, and multi-branch loan portfolios.",
      "offers": [
        {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD",
          "description": "Free Self-Hosted Open Source Edition (BSL 1.1 / MIT)",
        },
        {
          "@type": "Offer",
          "price": "49.00",
          "priceCurrency": "USD",
          "description": "Cloud SaaS Growth Plan with automated SMS follow-ups & multi-branch management",
        },
      ],
    },
    {
      "@type": "Organization",
      "name": "Pawnify Cloud Inc.",
      "url": "https://pawnify.cloud",
      "logo": "https://pawnify.cloud/icon.png",
      "sameAs": ["https://github.com/libresource/pawnify"],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} light`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdStructuredData) }}
        />
      </head>
      <body
        className="min-h-screen font-sans antialiased"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        suppressHydrationWarning
      >
        <ReduxProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}

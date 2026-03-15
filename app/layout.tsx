import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSplashShell } from "./_components/app-splash-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Chaos League – March Madness Edition",
    template: "%s | Chaos League",
  },
  description:
    "Chaos League is a strategic, portfolio-driven March Madness competition featuring Hero, Villain, and Cinderella dynamics.",
  applicationName: "Chaos League",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/icons/favicon-32.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Chaos League",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Chaos League – March Madness Edition",
    description:
      "A portfolio-based March Madness league built around leverage, rivalry, and chaos.",
    url: "https://chaos-game-march-madness-edition.vercel.app",
    siteName: "Chaos League",
    images: [
      {
        url: "/chaos-shield.png",
        width: 512,
        height: 512,
        alt: "Chaos League Shield Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chaos League – March Madness Edition",
    description:
      "A strategic March Madness portfolio league built for leverage and chaos.",
    images: ["/chaos-shield.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f19",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full overflow-x-hidden bg-[#0b0f19]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} app-shell flex max-w-full flex-col overflow-x-hidden bg-[#0b0f19] text-[#e8ecf5] antialiased`}
      >
        <AppSplashShell>
          <div className="app-shell flex w-full min-w-0 max-w-full flex-1 flex-col bg-[#0b0f19]">
            {children}
          </div>
        </AppSplashShell>
      </body>
    </html>
  );
}

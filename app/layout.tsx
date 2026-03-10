import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  icons: {
    icon: "/chao-shield.png",
  },
  openGraph: {
    title: "Chaos League – March Madness Edition",
    description:
      "A portfolio-based March Madness league built around leverage, rivalry, and chaos.",
    url: "https://chaos-game-march-madness-edition.vercel.app",
    siteName: "Chaos League",
    images: [
      {
        url: "/chao-shield.png",
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
    images: ["/chao-shield.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased overflow-x-hidden flex flex-col max-w-full`}
      >
        <div className="flex min-h-dvh w-full min-w-0 max-w-full flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
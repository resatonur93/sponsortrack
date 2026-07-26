import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  ),
  title: {
    default: "SponsorTrack",
    template: "%s | SponsorTrack",
  },
  description:
    "UK sponsor licence compliance management for employers — Compliance Made Clear.",
  applicationName: "SponsorTrack",
  icons: {
    icon: [{ url: "/logo-sponsor-track.png", type: "image/png" }],
    apple: [{ url: "/logo-sponsor-track.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "SponsorTrack — Compliance Made Clear",
    description:
      "UK sponsor licence compliance management for employers.",
    type: "website",
    images: [
      {
        url: "/logo-sponsor-track.png",
        alt: "SponsorTrack",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SponsorTrack — Compliance Made Clear",
    description:
      "UK sponsor licence compliance management for employers.",
    images: ["/logo-sponsor-track.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable} ${sourceSerif.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

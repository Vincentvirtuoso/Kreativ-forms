import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "@splenddev/kreativ-ui/styles.css";
import "./globals.css";
import { Providers } from "../components/providers/Providers";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Form Studio",
    template: "%s | Form Studio",
  },
  description: "Fill, sign and personalize digital documents without printing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="kui-scrollbar"
      style={
        {
          "--font-body": bodyFont.style.fontFamily,
          "--font-heading": headingFont.style.fontFamily,
          "--font-mono": monoFont.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

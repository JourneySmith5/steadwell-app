import type { Metadata } from "next";
// Self-hosted via @fontsource (npm-distributed font files) rather than
// next/font/google, which fetches from fonts.googleapis.com at build time —
// not reachable from every network. Same fonts, no runtime difference.
import "@fontsource/cormorant/500.css";
import "@fontsource/cormorant/600.css";
import "@fontsource/cormorant/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steadwell",
  description: "Financial coaching, built around your first real clients.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-brand-cream">{children}</body>
    </html>
  );
}

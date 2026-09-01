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
  manifest: "/manifest.json",
  appleWebApp: {
    // Enables "Add to Home Screen" as a real installed app rather than a
    // bookmark shortcut — required for iOS Web Push to work at all (see
    // src/components/PushNotifications.tsx).
    capable: true,
    statusBarStyle: "default",
    title: "Steadwell",
  },
};

export const viewport = {
  themeColor: "#1F3D34",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-brand-cream">{children}</body>
    </html>
  );
}

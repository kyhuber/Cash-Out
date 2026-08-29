import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cash Out",
  description:
    "Log a shift by talking or typing a sentence, and keep your own record to check against your paycheck.",
  // Drives the standalone display and home-screen name on iOS.
  appleWebApp: {
    capable: true,
    title: "Cash Out",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom is deliberately left enabled. Inputs are 16px so iOS won't
  // auto-zoom on focus, which is the usual reason people disable it.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

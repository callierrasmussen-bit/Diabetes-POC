import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CarePlate — A little care, every day",
  description: "Simple meals and everyday wellness, together.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CarePlate" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#244e40",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

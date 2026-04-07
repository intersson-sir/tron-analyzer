import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRON Flow Analyzer",
  description: "Visual transaction graph analysis for TRON blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0e17] antialiased">{children}</body>
    </html>
  );
}

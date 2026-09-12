import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RightsRadar UK",
  description:
    "Plain-English UK legal rights information, official-source guidance and law-change tracking for Scotland, England & Wales, and Northern Ireland.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

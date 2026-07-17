import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Work-Feud | The Ultimate Office Showdown",
  description: "A fast, friendly survey showdown built for the workplace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

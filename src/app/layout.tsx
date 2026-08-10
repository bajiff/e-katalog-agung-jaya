// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E Katalog Agung Jaya",
  description: "Website E Katalog Agung Jaya untuk memudahkan pencarian dan pemesanan produk",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-US">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

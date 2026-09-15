// app/layout.tsx
import "./global.css";
import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: { icon: { url: "/favicon-globaltrip.png", type: "image/png" } },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body className="min-h-screen bg-gray-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

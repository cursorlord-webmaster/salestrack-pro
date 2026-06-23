import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesTrack Pro",
  description: "Multi-tenant inventory and POS management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body
        className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans"
        style={{ fontFamily: 'Calibri, Segoe UI, system-ui, sans-serif' }}
      >
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RestoFast | Gestión de Restaurantes",
  description: "Sistema ágil para la gestión de restaurantes, pedidos y cocina.",
  manifest: "/manifest.json",
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased`}>
        {children}
        <Toaster richColors position="top-center" closeButton theme="dark" />
      </body>
    </html>
  );
}

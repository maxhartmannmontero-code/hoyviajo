import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Hoy Viajo CRM",
  description: "Sistema CRM de Hoy Viajo · Seguimiento de clientes y negocios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-[#f4efe6] font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

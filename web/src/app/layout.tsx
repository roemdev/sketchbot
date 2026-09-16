import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ARKANIA • Comunidad de Discord & Servidores Dedicados",
  description:
    "Comunidad oficial de ARKANIA. Servidores dedicados 24/7 de Minecraft, Palworld, Enshrouded y Project Zomboid, con economía e interfaz interactiva por SketchBot.",
  keywords: [
    "ARKANIA",
    "Comunidad Discord",
    "Servidor Minecraft",
    "Servidor Palworld",
    "Servidor Enshrouded",
    "Servidor Project Zomboid",
    "Discord Gaming",
    "SketchBot",
  ],
  authors: [{ name: "roemdev" }],
  openGraph: {
    title: "ARKANIA • Comunidad de Discord & Servidores Dedicados",
    description:
      "Una comunidad de Discord con un poco de cianuro pero con mucho amor.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} ${plusJakartaSans.className}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={plusJakartaSans.className}>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Nampark Route Management System",
  description: "Daily Rep & Driver Reporting, and Weekly Intelligence Engine for Nampark Branch Operations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nampark RMS",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Nampark RMS" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nampark RMS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#065f46" />
      </head>
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans antialiased bg-ivory-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://healthstackbd.com"),
  title: "স্বাস্থ্য সাথী | Health Stack BD",
  description: "বাংলাদেশের রোগীদের জন্য এআই-চালিত ডিজিটাল হেলথ রেকর্ড প্ল্যাটফর্ম",
  manifest: "/manifest.json",
  applicationName: "Health Stack BD",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Health Stack BD",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "স্বাস্থ্য সাথী",
    title: "স্বাস্থ্য সাথী | Digital Health Record",
    description: "বাংলাদেশের রোগীদের জন্য এআই-চালিত ডিজিটাল হেলথ রেকর্ড প্ল্যাটফর্ম",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-bangla antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

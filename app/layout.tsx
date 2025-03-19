import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Meditation Orb",
  description: "A relaxing interactive orb experience",
  icons: {
    icon: '/favicon.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: "Meditation Orb",
    description: "A relaxing interactive orb experience",
    images: [
      {
        url: "/Relaxing-Blob-v2.jpg",
        width: 1200,
        height: 630,
        alt: "Meditation Orb",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meditation Orb",
    description: "A relaxing interactive orb experience",
    images: ["/Relaxing-Blob-v2.jpg"],
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
        <link rel="icon" href="/favicon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
        <meta property="og:image" content="/Relaxing-Blob-v2.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Meditation Orb" />
        <meta name="twitter:image" content="/Relaxing-Blob-v2.jpg" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

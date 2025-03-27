import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { FloatingNav } from "@/components/ui/floating-nav"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KasiFesyen - Your AI Fashion Stylist",
  description: "Get personalized fashion recommendations and outfit suggestions powered by AI. Create stunning looks with our smart fashion assistant.",
  keywords: "fashion, AI stylist, outfit recommendations, personal stylist, fashion advice, clothing combinations, style guide",
  openGraph: {
    title: "KasiFesyen - Your AI Fashion Stylist",
    description: "Get personalized fashion recommendations and outfit suggestions powered by AI",
    type: "website",
    locale: "en_US",
    images: [{
      url: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&h=630&q=80",
      width: 1200,
      height: 630,
      alt: "KasiFesyen AI Fashion Stylist"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "KasiFesyen - Your AI Fashion Stylist",
    description: "Get personalized fashion recommendations and outfit suggestions powered by AI",
    images: ["https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&h=630&q=80"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src="https://cdn.counter.dev/script.js" data-id="2350b3bf-6568-4f59-ae32-b96d4d7ab181" data-utcoffset="8"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <FloatingNav />
            {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

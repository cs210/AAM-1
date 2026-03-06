import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { getToken } from "@/lib/auth-server";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YAMI — Your Art, Museum & Identity",
  description:
    "The first social, automated record of human cultural engagement. Discover museums as a visitor or manage your institution through the staff dashboard.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();
  return (
    <html lang="en" className={`${publicSans.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ConvexClientProvider initialToken={token}>
            {children}
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

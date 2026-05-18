import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prowider Mini Lead Distribution System",
  description: "Lead distribution system with round-robin allocation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="bg-gray-900 text-white px-6 py-3 flex gap-6">
          <a href="/" className="font-bold">Prowider</a>
          <a href="/request-service" className="hover:underline">Request Service</a>
          <a href="/dashboard" className="hover:underline">Dashboard</a>
          <a href="/test-tools" className="hover:underline">Test Tools</a>
        </nav>
        {children}
      </body>
    </html>
  );
}

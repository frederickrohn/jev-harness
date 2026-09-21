import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Sidebar } from "@/app/ui/sidebar";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Jev Lab",
    template: "%s | Jev Lab",
  },
  description:
    "A public laboratory for running Jev experiments and reading what they reveal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistMono.variable} data-scroll-behavior="smooth">
      <body>
        <Sidebar />
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";

export const metadata: Metadata = {
  title: "Facticity",
  description: "Source-backed fact checking with evidence from trusted references.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

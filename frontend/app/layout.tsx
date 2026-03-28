import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { AppEffects } from "@/components/AppEffects";

export const metadata: Metadata = {
  title: "Vouch",
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
        <AuthProvider>
          <AppEffects>{children}</AppEffects>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import HomePageClient from "@/components/HomePageClient";

export const metadata: Metadata = {
  title: "Vouch - Source-Backed Fact Checking",
  description:
    "Vouch fact-checks claims against connected fact-check and news sources, then explains the verdict with linked evidence.",
};

export default function Home() {
  return <HomePageClient />;
}

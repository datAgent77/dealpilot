import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealPilot — agent-native vehicle marketplace",
  description:
    "An agent-native used-car marketplace. Traditional websites make agents navigate pages; DealPilot gives agents the tools to understand the market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

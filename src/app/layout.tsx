import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Shelter inventory system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

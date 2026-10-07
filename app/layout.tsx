import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "BuildBox",
  description: "Turn a sentence into a production-ready website with BuildBox.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

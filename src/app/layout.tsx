import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NotebookLM",
    template: "%s | NotebookLM",
  },
  description: "AI-powered notebook for learning and research",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "NotebookLM",
    description: "AI-powered notebook for learning and research",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}

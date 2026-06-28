import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Clank! Online — A Deck-Building Dungeon Crawl",
  description: "Async multiplayer online version of Clank! A Deck-Building Adventure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dungeon-950 bg-dungeon-texture min-h-screen font-body text-parchment-200 antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1a150e",
              color: "#ecdcb3",
              border: "1px solid #7d5c17",
            },
            success: { iconTheme: { primary: "#dcb24a", secondary: "#1a150e" } },
            error: { iconTheme: { primary: "#c2362c", secondary: "#1a150e" } },
          }}
        />
      </body>
    </html>
  );
}

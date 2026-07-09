import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "VA AI Suite",
  description:
    "In-browser AI console for VA services — suggestions, documents, invoices, social, prospects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-6 py-8 md:px-10 max-w-6xl">{children}</main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import NotificationToast from "@/components/NotificationToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "乐转赠 — 转赠带来快乐",
  description:
    "一个断舍离转赠平台。让物质丰富的人通过转赠获得持久的快乐，让有需要的人免费获得物资。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-warm-50 text-warm-900 font-sans">
        <Navbar />
        <NotificationToast />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

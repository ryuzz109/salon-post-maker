import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "個人サロン向け SNS投稿ネタ生成ツール",
  description:
    "整体、美容、ネイル、エステ、ジム、占い、個人講師向けにInstagram投稿案、Threads短文、ハッシュタグを無料生成します。",
  openGraph: {
    title: "個人サロン向け SNS投稿ネタ生成ツール",
    description: "SNS投稿に悩む個人事業主向けの無料投稿ネタ生成ツールです。",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Nhật ký AI đọc email | Automation Hub",
  description: "Bảng theo dõi và kiểm soát nhật ký AI xử lý yêu cầu cấp quyền CNTT",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

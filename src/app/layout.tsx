import type { ReactNode } from "react";

export const metadata = {
  title: "Automation Hub",
  description: "Cầu nối Jira, AI và Supabase cho quy trình cấp quyền truy cập",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

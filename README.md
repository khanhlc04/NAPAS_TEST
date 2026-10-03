# Số hóa quy trình cấp quyền truy cập hệ thống (NAPAS TEST)

Bài thực hành: chuyển quy trình xin cấp quyền truy cập hệ thống CNTT, vốn làm qua email, thành quy trình số có phê duyệt hai cấp, SLA và báo cáo.

Giải pháp gồm hai phần:

| Phần | Công nghệ | Làm gì |
|---|---|---|
| **Jira Service Management** (lõi) | Jira Cloud, project `CQ` | Cổng gửi yêu cầu, biểu mẫu, phê duyệt hai cấp, SLA, hàng đợi, thông báo, nhận yêu cầu qua email, quy tắc Automation |
| **Automation Hub** (cầu nối AI) | Next.js, Vercel, Supabase, Jev (TypeSafe AI) | Đọc email xin quyền, điền trường vào ticket hoặc hỏi lại người gửi, ghi nhật ký mỗi lần AI xử lý |

```
Email  →  Jira (R1)  →  Hub /api/jira/email-intake  →  Jev phân loại
                              │                              │
                              ├─ đủ thông tin  → điền trường vào ticket
                              ├─ thiếu         → hỏi lại người gửi, ticket sang "Chờ bổ sung"
                              └─ không phải yêu cầu → để ở hàng đợi cho Service Desk
                              │
                              └─ ghi nhật ký vào Supabase → trang nhật ký AI trên Vercel
```

AI chỉ phân loại và điền trường. AI không có quyền phê duyệt.

## 1. Xem kết quả trên Vercel

- Địa chỉ: **https://napas-hub.vercel.app**
- Trang chủ là **Nhật ký AI**: số email đã xử lý, tỷ lệ điền tự động, thời gian xử lý trung bình, bảng từng lượt xử lý. Bấm vào một dòng để xem JSON AI trích xuất và độ tin cậy.
- Bộ lọc theo kết quả: `filled` (đã điền), `asked` (đã hỏi lại), `not_request` (không phải yêu cầu), `failed` (lỗi, để người xử lý tay).
- Kiểm tra dịch vụ còn sống: https://napas-hub.vercel.app/api/health

Nếu trình duyệt hiện trang đăng nhập Vercel thay vì trang nhật ký, nghĩa là tác giả chưa mở công khai bản production. Hãy báo tác giả.

## 2. Xem Jira

Đây là site Jira **dùng thử, chỉ chứa dữ liệu mẫu** để minh họa bài thực hành. Jira không có link công khai cho người lạ, nên tác giả cấp sẵn một tài khoản xem:

| Mục | Giá trị |
|---|---|
| Địa chỉ | https://khanhlc04.atlassian.net |
| Loại tài khoản | Tài khoản Atlassian, vai trò **Service Desk Team** (agent) trong project `CQ`, không phải quản trị viên |
| Email | `khanhlc04+reviewer@gmail.com` |
| Mật khẩu | `Reviewer@123` |

Vai trò Service Desk Team vào được hàng đợi, ticket và quy tắc Automation, nhưng không quản trị site và không phát sinh chi phí. Tài khoản này sửa được ticket, nên xin chỉ xem và không đổi dữ liệu.

Các bước:

1. Mở **https://khanhlc04.atlassian.net** và đăng nhập bằng tài khoản ở bảng trên.
2. Hàng đợi và ticket: **https://khanhlc04.atlassian.net/jira/servicedesk/projects/CQ/queues**
3. Cổng gửi yêu cầu (góc nhìn của nhân viên): **https://khanhlc04.atlassian.net/servicedesk/customer/portals**
4. Quy tắc Automation: trong project `CQ`, mở **Project settings → Automation**.

Nên xem theo thứ tự:

| Muốn thấy | Vào đâu |
|---|---|
| Yêu cầu do AI điền trường | Mở một ticket có comment bắt đầu bằng "AI (Jev …) đã điền yêu cầu từ email" |
| Yêu cầu AI hỏi lại người gửi | Ticket ở trạng thái "Chờ bổ sung", có comment hỏi lại bằng tiếng Việt |
| Email không liên quan | Ticket có comment "Không phải yêu cầu cấp quyền" |
| Phê duyệt hai cấp | Ticket ở trạng thái "Chờ Trưởng ĐV duyệt" hoặc các trạng thái sau đó |
| Đối chiếu với nhật ký AI | Khóa ticket (ví dụ `CQ-18`) khớp với cột khóa ticket trong trang nhật ký trên Vercel |

Site Jira dùng thử đến khoảng **29/10/2026**. Sau ngày này site có thể ngừng hoạt động.

## 3. Cách chạy lại trên máy

Yêu cầu: Node.js 20 trở lên.

```bash
npm install
cp .env.example .env.local   # điền giá trị thật, xem bảng bên dưới
npm test                     # chạy kiểm thử
npm run dev                  # http://localhost:3000
```

Biến môi trường (xem `.env.example`):

| Biến | Ý nghĩa |
|---|---|
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` | Site Jira và tài khoản dịch vụ của Hub |
| `HUB_SHARED_SECRET` | Chuỗi bí mật Jira gửi kèm header `x-hub-secret` khi gọi Hub |
| `TYPESAFE_API_KEY`, `JEV_MODEL` | Khóa Jev và phiên bản model được ghim |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Cơ sở dữ liệu nhật ký, chỉ dùng phía server |
| `APP_TIMEZONE` | Múi giờ để hiểu "hôm nay", "thứ Hai tuần sau" |

Tạo bảng nhật ký bằng file trong `supabase/migrations/` (dán vào Supabase SQL Editor).

Các lệnh khác: `npm run typecheck`, `npm run eval:jev` (chạy bộ email mẫu qua Jev thật), `npm run probe`.

## 4. Triển khai tự động (CI/CD)

Repo GitHub `khanhlc04/NAPAS_TEST` đã nối với dự án Vercel `napas-hub`:

- Push lên `main` → Vercel tự build và triển khai **production**.
- Push lên nhánh khác hoặc mở pull request → Vercel tạo bản **preview** riêng.
- Biến môi trường đặt trong Vercel (Settings → Environment Variables), không nằm trong repo.

## 5. Cấu trúc thư mục

```
src/app/            trang nhật ký AI và API (health, email-intake)
src/lib/intake/     phân tích email, quyết định điền hay hỏi lại, đọc ngày, mã sự cố
src/lib/ai/         gọi Jev
src/lib/jira/       đọc và ghi Jira
src/lib/store/      ghi nhật ký vào Supabase
supabase/migrations bảng ai_extractions
scripts/            đánh giá Jev, thăm dò kết nối
```

## 6. Giới hạn đã biết

- SLA cần gói Jira trả phí hoặc bản dùng thử Premium; site hiện chạy trên bản dùng thử.
- Việc thu hồi quyền khi hết hạn chưa làm trong Hub. Đây là hướng mở rộng, dự kiến dùng quy tắc theo lịch của Jira.
- Dữ liệu trong Jira và nhật ký AI là dữ liệu mẫu do tác giả tạo để minh họa.

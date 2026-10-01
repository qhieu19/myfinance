# Kiến trúc & Cấu trúc thư mục

## Tổng quan
UI (`public/`) gọi tới các endpoint `/api/*`. Các hàm Node dùng `lib/db.js` (`pg`) để truy vấn Supabase Postgres. Ở local, `server.js` phục vụ cả hai. Trên Vercel, `api/` là serverless và `vercel.json` phục vụ file tĩnh.

## Cấu trúc thư mục
- `public/`: Chỉ chứa UI (không chứa thông tin nhạy cảm)
  - `index.html`: Cấu trúc + popup
  - `script.js`: State, chuyển tháng, CRUD, xuất CSV
  - `style.css`: Giao diện
- `api/`: Mỗi file một chức năng (Vercel API)
- `lib/`: `db.js` (getPool), `http.js`
- `scripts/init-db.js`: Khởi tạo DB
- `server.js`: HTTP server local

## Cấu trúc Database
Tất cả bảng đều có `year` + `month` để lưu lịch sử theo tháng.
- `incomes`: name, amount, year, month
- `fixed_expenses`: name, category, estimate_amount, actual_amount, due_day, is_paid, year, month
- `daily_expenses`: name, amount, year, month

## Quy tắc API
- List/create yêu cầu `year` + `month` (qua query hoặc JSON body)
- Update/delete dùng `id`
- `POST /api/month` sao chép thu nhập + chi phí cố định (reset trạng thái chưa thanh toán) của tháng trước nếu tháng hiện tại trống.

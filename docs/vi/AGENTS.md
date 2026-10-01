# Hướng dẫn cho AI Agents
File này là điểm truy cập cho bất kỳ AI nào làm việc với source code này.

## Tech Stack (Công nghệ)
- UI: HTML / CSS / JS thuần trong `public/`
- API: Vercel serverless Node.js handlers trong `api/`
- Dùng chung: `lib/db.js` (pg), `lib/http.js`
- Database: Supabase Postgres (Session pooler)

## Các lệnh (Commands)
- `npm run init-db`: Tạo bảng và seed dữ liệu nếu rỗng
- `npm run dev`: Chạy server local tại http://localhost:3000
- `npx vercel --prod`: Deploy lên Vercel

## Quy tắc & Quy ước
1. Thay đổi Database: Sửa `scripts/init-db.js`, chạy `npm run init-db`.
2. Thay đổi API: Sửa `api/*.js`, giữ nguyên các helper trong `lib/http.js`.
3. Thay đổi UI: Sửa các file trong `public/`.
4. Bảo mật: `DATABASE_URL` nằm trong `.env` (tuyệt đối không commit). Production dùng biến môi trường của Vercel.

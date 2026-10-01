# Đặc tả Sản phẩm (Product Specification)

## Vấn đề
Cần theo dõi thu nhập và chi tiêu hộ gia đình hàng tháng. Theo dõi các hóa đơn cố định (ngày hạn khác nhau) và chi tiêu hàng ngày, xem số dư còn lại, lưu lịch sử theo tháng.

## Giải pháp
Web app thân thiện với mobile, quản lý thu nhập, chi phí cố định và chi phí hàng ngày.

## Tính năng cốt lõi
- Thẻ tóm tắt: Thu nhập, đã chi, còn lại, % tiến độ.
- Tabs: Cố định / Hàng ngày / Thu nhập.
- CRUD: Thêm/sửa/xóa cho cả 3 loại.
- Màu sắc thanh toán: Chi phí cố định hiển thị số tiền đã trả màu xanh, chưa trả màu đỏ.
- Chuyển tháng: Chuyển qua lại giữa các tháng, dữ liệu lọc theo năm+tháng.
- Sao chép tháng trước: Tự động copy thu nhập + chi phí cố định.
- Xuất CSV: Tải xuống tháng hiện tại, nút nhấp nháy nhắc nhở vào các ngày 25–30.

## State chính của UI
- `viewYear`, `viewMonth` — tháng đang xem
- `incomes`, `fixedExpenses`, `dailyExpenses` — danh sách dữ liệu của tháng đó

## Hướng dẫn cài đặt và chạy ở Local

1. **Cài đặt thư viện:**
   Chạy lệnh `npm install` để cài đặt các thư viện cần thiết.

2. **Cấu hình môi trường:**
   - Đảm bảo bạn có file `.env` ở thư mục gốc.
   - Khai báo chuỗi kết nối cơ sở dữ liệu:
     ```env
     DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
     ```

3. **Khởi tạo Database (nếu chạy lần đầu):**
   Chạy lệnh `npm run init-db` để tạo các bảng dữ liệu tự động.

4. **Khởi chạy ứng dụng:**
   Chạy lệnh `npm run dev`. 
   Trình duyệt sẽ chạy ứng dụng tại địa chỉ: `http://localhost:3000`

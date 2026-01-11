# 🚀 BẮT ĐẦU NGAY - 5 BƯỚC

## Bước 1: Cài đặt

Mở CMD trong folder này (`c:\laybo_store bot`):

```cmd
npm install
```

**⏱️ Chờ 1-2 phút để tải xong packages**

---

## Bước 2: Lấy Bot Token

1. Mở Telegram, tìm **@BotFather**
2. Chat với nó, gửi: `/newbot`
3. Đặt tên bot (vd: `LayBo Store Bot`)
4. Đặt username (vd: `laybo_store_bot`)
5. **Copy token** nó gửi cho mày (dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

## Bước 3: Lấy Chat ID

1. Mở Telegram, tìm **@userinfobot**
2. Click Start
3. **Copy số ID** nó gửi cho mày (dạng: `123456789`)

---

## Bước 4: Tạo file .env

Tạo file mới tên `.env` trong folder này, paste vào:

```env
NODE_ENV=development
BOT_TOKEN=PASTE_TOKEN_Ở_ĐÂY
ADMIN_CHAT_ID=PASTE_CHAT_ID_Ở_ĐÂY
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/laybo_store

SEPAY_ACCOUNT_NUMBER=0123456789
SEPAY_ACCOUNT_NAME=NGUYEN VAN A
SEPAY_BANK_CODE=MB
SEPAY_TEMPLATE=compact
```

**Thay thế:**
- `PASTE_TOKEN_Ở_ĐÂY` → token từ BotFather
- `PASTE_CHAT_ID_Ở_ĐÂY` → chat ID từ userinfobot

---

## Bước 5: Setup Database

### Nếu mày CHƯA có PostgreSQL:

**Cài PostgreSQL:**
1. Download: https://www.postgresql.org/download/windows/
2. Chạy installer, password đặt: `postgres`
3. Port để mặc định: `5432`

**Sau khi cài xong, mở CMD:**

```cmd
psql -U postgres
```

Nhập password: `postgres`

Trong psql, chạy:

```sql
CREATE DATABASE laybo_store;
\q
```

### Nếu mày ĐÃ có PostgreSQL:

Chỉ cần tạo database:

```cmd
psql -U postgres
```

```sql
CREATE DATABASE laybo_store;
\q
```

**Update .env** nếu password khác:
```env
DATABASE_URL=postgresql://postgres:MẬT_KHẨU_CỦA_MÀY@localhost:5432/laybo_store
```

---

## Bước 6: Chạy Migration

Trong CMD (folder `c:\laybo_store bot`):

```cmd
npm run db:migrate
npm run db:seed
```

Xong là đã có data mẫu trong database!

---

## Bước 7: CHẠY BOT! 🚀

```cmd
npm run dev
```

**Nếu thấy màn hình hiện:**

```
✅ Database connected
🤖 Telegram bot started
🚀 Server listening on port 3000
```

→ **THÀNH CÔNG!** 🎉

---

## Bước 8: Test Bot

1. Mở Telegram
2. Tìm bot username mày vừa tạo
3. Gửi `/start`
4. Click **🟦 Canva** hoặc **🎬 Netflix**
5. Chọn plan → nhập email/số lượng → nhận QR thanh toán

---

## 🆘 LỖI THƯỜNG GẶP

### Lỗi 1: "Cannot find module"

```cmd
npm install
```

### Lỗi 2: "Database connection failed"

Check lại `.env`:
- `DATABASE_URL` có đúng không?
- PostgreSQL đã chạy chưa?

Kiểm tra PostgreSQL đang chạy:
```cmd
pg_isready -U postgres
```

### Lỗi 3: "Unauthorized" khi test bot

Check lại:
- `BOT_TOKEN` trong `.env` có đúng không?
- Copy đầy đủ chưa?

### Lỗi 4: "Port 3000 already in use"

Đổi port trong `.env`:
```env
PORT=3001
```

---

## 📱 TEST THANH TOÁN

### Cách 1: Giả lập webhook (local)

Tạo 1 đơn hàng trong bot (gửi `/start`, chọn Canva), copy mã đơn (dạng `ORD_ABC12345`).

Chạy script test:

```cmd
node test-webhook.js ORD_ABC12345 140000
```

Bot sẽ tự động:
- ✅ Đánh dấu đơn hàng đã thanh toán
- ✅ Gửi thông báo cho user
- ✅ Gửi thông báo cho admin

### Cách 2: Dùng SePay thật

1. Đăng ký tài khoản SePay: https://sepay.vn
2. Lấy API key và account number
3. Cấu hình webhook URL: `https://domain-của-mày.com/webhooks/sepay`
4. Test bằng cách chuyển tiền thật vào account

---

## 🎯 NEXT STEPS

Sau khi bot chạy OK:

1. **Deploy lên server** → xem [DEPLOYMENT.md](DEPLOYMENT.md)
2. **Thêm sản phẩm mới** → edit database hoặc dùng Prisma Studio
3. **Tùy chỉnh bot** → edit code trong `src/bot/handlers/`

---

## 💡 TÓM TẮT LỆNH QUAN TRỌNG

```cmd
# Cài packages
npm install

# Chạy migration
npm run db:migrate

# Seed data mẫu
npm run db:seed

# Chạy bot (development)
npm run dev

# Chạy bot (production)
npm start

# Mở Prisma Studio (xem database)
npm run db:studio

# Test webhook
node test-webhook.js ORD_xxxxxxxx 140000
```

---

## 🎊 DONE!

Mày giờ có 1 con bot bán hàng hoàn chỉnh:
- ✅ Nhận order qua Telegram
- ✅ Tạo QR thanh toán
- ✅ Nhận webhook từ SePay
- ✅ Tự động gửi tài khoản Netflix
- ✅ Quản lý inventory
- ✅ Thông báo admin

**Cần help?** Đọc:
- [README.md](README.md) - Tổng quan dự án
- [API.md](API.md) - API documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Hướng dẫn deploy
- [SEPAY_INTEGRATION.md](SEPAY_INTEGRATION.md) - Chi tiết SePay

Hoặc hỏi luôn! 😎

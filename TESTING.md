# Testing Checklist

Checklist để test toàn bộ chức năng của LayBo Store Bot.

---

## ✅ Setup & Configuration

- [ ] `.env` file được cấu hình đúng
- [ ] Database connection thành công
- [ ] Prisma migrations chạy thành công
- [ ] Seed data được tạo (products, variants)
- [ ] Bot token hợp lệ
- [ ] Admin chat ID đúng
- [ ] Server khởi động thành công (port 3000)

---

## 🤖 Bot Basic Functions

### Commands

- [ ] `/start` - Hiển thị main menu
- [ ] `/help` - Hiển thị support info
- [ ] Menu có 3 nút: Canva, Netflix, Support

### Support

- [ ] Nút "Support" hiển thị thông tin @ducngg411

---

## 🟦 Canva Flow (Happy Path)

### 1. Product Selection

- [ ] Click "Canva" → hiển thị 4 plans
- [ ] Plans hiển thị đúng giá:
  - [ ] 1 tháng - ₫50,000
  - [ ] 3 tháng - ₫140,000
  - [ ] 6 tháng - ₫270,000
  - [ ] 12 tháng - ₫500,000

### 2. Plan Selection

- [ ] Chọn plan → hiển thị quantity buttons
- [ ] Có buttons: 1, 2, 3, 4, 5, "Nhập số khác"

### 3. Quantity Selection - Quick Buttons

- [ ] Chọn "3" → hiển thị prompt nhập email
- [ ] Message hiển thị đúng số lượng (3 email)
- [ ] Message hiển thị đúng tổng tiền

### 4. Quantity Selection - Custom

- [ ] Chọn "Nhập số khác" → hiển thị prompt
- [ ] Nhập "10" → chấp nhận
- [ ] Nhập "abc" → báo lỗi
- [ ] Nhập "0" → báo lỗi
- [ ] Nhập "51" → báo lỗi (max 50)

### 5. Email Input - Valid

Gửi:
```
test1@gmail.com
test2@gmail.com
test3@gmail.com
```

- [ ] Chấp nhận danh sách
- [ ] Tạo order thành công
- [ ] Hiển thị QR code
- [ ] Hiển thị order ID
- [ ] Hiển thị payment reference
- [ ] Hiển thị countdown (15 phút)
- [ ] Có nút "Huỷ đơn" và "Tôi đã thanh toán"

### 6. Email Input - Invalid Cases

**Số lượng không khớp:**
```
test1@gmail.com
test2@gmail.com
```
- [ ] Báo lỗi: "Số lượng email không khớp"

**Email không hợp lệ:**
```
invalid-email
test2@gmail.com
test3@gmail.com
```
- [ ] Báo lỗi: "Email không hợp lệ"

**Email trùng lặp:**
```
test1@gmail.com
test1@gmail.com
test3@gmail.com
```
- [ ] Báo lỗi: "Email trùng lặp"

**Email có space:**
```
test 1@gmail.com
test2@gmail.com
test3@gmail.com
```
- [ ] Báo lỗi: "Email không được chứa khoảng trắng"

### 7. Order Created

- [ ] Order lưu vào database
- [ ] Status = PENDING_PAYMENT
- [ ] Metadata chứa email list
- [ ] ExpiresAt = now + 15 phút
- [ ] PaymentRef unique

---

## 🎬 Netflix Flow (Happy Path)

### 1. Product Selection

- [ ] Click "Netflix" → hiển thị plans
- [ ] Plan hiển thị: 1 tháng - ₫80,000

### 2. Plan Selection

- [ ] Chọn plan → hiển thị quantity buttons
- [ ] Có buttons: 1, 2, 3, 4, 5, "Nhập số khác"

### 3. Quantity Selection

- [ ] Chọn "2" → check inventory
- [ ] Nếu đủ hàng → tạo order + show QR
- [ ] Nếu không đủ → báo "Hết hàng"

### 4. Inventory Reservation

- [ ] 2 items chuyển status AVAILABLE → RESERVED
- [ ] ReservedUntil = order.expiresAt
- [ ] Order được tạo

### 5. Order Created

- [ ] Hiển thị QR code
- [ ] Hiển thị đúng tổng tiền (80,000 x 2 = 160,000)
- [ ] Có nút "Huỷ đơn"

---

## 💳 Payment Flow (Webhook)

### 1. Test Webhook

Chạy:
```bash
node test-webhook.js <order_id> <amount>
```

- [ ] Webhook endpoint nhận request
- [ ] Validate amount
- [ ] Create PaymentEvent
- [ ] Update order status → PAID

### 2. Canva Order - After Payment

- [ ] User nhận message: "Thanh toán thành công!"
- [ ] Admin group nhận notification với:
  - [ ] Order ID
  - [ ] User info
  - [ ] Product info
  - [ ] Email list
  - [ ] Buttons: Đang xử lý, Hoàn thành, Thất bại

### 3. Netflix Order - After Payment

- [ ] Inventory items → SOLD
- [ ] User nhận tài khoản Netflix (username, password, expiry)
- [ ] Format dễ copy
- [ ] Admin nhận notification (optional)

### 4. Idempotency

Gửi webhook 2 lần với cùng transactionId:
- [ ] Lần 1: processed
- [ ] Lần 2: ignored (200 OK nhưng không xử lý)

---

## 👨‍💼 Admin Functions

### Admin Notifications

- [ ] Admin group nhận thông báo đơn mới
- [ ] Hiển thị đầy đủ thông tin
- [ ] Email list hiển thị (nếu Canva)

### Admin Actions - Canva Order

**Click "Đang xử lý":**
- [ ] Order status → IN_PROGRESS
- [ ] Buttons biến mất

**Click "Hoàn thành":**
- [ ] Order status → FULFILLED
- [ ] User nhận message: "Email đã nâng cấp thành công"
- [ ] Danh sách email hiển thị

**Click "Thất bại":**
- [ ] Order status → FAILED
- [ ] User nhận message: "Đơn hàng thất bại, liên hệ admin để hoàn tiền"

---

## ❌ Order Cancellation

### User Cancel

- [ ] Click "Huỷ đơn" khi order PENDING_PAYMENT
- [ ] Order status → CANCELLED
- [ ] Inventory released (nếu Netflix)
- [ ] Message xác nhận huỷ

### Cannot Cancel

- [ ] Không thể huỷ order đã PAID
- [ ] Không thể huỷ order đã FULFILLED

---

## ⏰ Order Expiry

### Setup

- [ ] Tạo order mới
- [ ] Set expiresAt = now - 1 phút (trong DB)
- [ ] Đợi background job chạy (1 phút)

### After Expiry

- [ ] Order status → EXPIRED
- [ ] Inventory released (nếu Netflix)
- [ ] User có thể tạo order mới

---

## 🔒 Constraints & Validations

### One Active Order Per User

- [ ] User có order PENDING_PAYMENT
- [ ] Try tạo order mới
- [ ] Bot hiển thị: "Bạn đang có đơn #xxx"
- [ ] Có nút xem QR và huỷ đơn
- [ ] Không cho tạo order mới

### After Order Completed

- [ ] Order status = FULFILLED
- [ ] User có thể tạo order mới

---

## 🗄️ Database Integrity

### Products

```sql
SELECT * FROM "Product";
```
- [ ] Có CANVA và NETFLIX
- [ ] isActive = true

### Variants

```sql
SELECT * FROM "Variant";
```
- [ ] Có 4 variants cho Canva
- [ ] Có 1 variant cho Netflix
- [ ] Giá đúng

### Orders

```sql
SELECT * FROM "Order" ORDER BY "createdAt" DESC LIMIT 5;
```
- [ ] Đơn mới nhất hiển thị
- [ ] Status đúng
- [ ] Metadata có email (Canva)

### PaymentEvents

```sql
SELECT * FROM "PaymentEvent";
```
- [ ] EventKey unique
- [ ] Raw payload đầy đủ

### InventoryItems

```sql
SELECT * FROM "InventoryItem";
```
- [ ] Status AVAILABLE/RESERVED/SOLD
- [ ] OrderId mapping đúng

---

## 🌐 Server Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```
- [ ] Return 200 OK
- [ ] Return JSON with status

### Webhook Endpoint

```bash
curl -X POST http://localhost:3000/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "paymentRef": "TEST"}'
```
- [ ] Return 200 (even if order not found)
- [ ] Log received payload

---

## 🔧 Error Handling

### Invalid Bot Token

- [ ] App fails to start với clear error message

### Database Connection Failed

- [ ] App fails to start với error message

### Webhook Invalid Payload

- [ ] Return 400 Bad Request
- [ ] Log error

### Order Not Found (Webhook)

- [ ] Return 200 OK
- [ ] Log warning

---

## 📊 Performance

### Response Time

- [ ] Bot commands phản hồi < 2s
- [ ] Webhook processing < 1s
- [ ] QR generation < 2s

### Memory Usage

- [ ] App sử dụng < 200MB RAM (development)

---

## 📱 Edge Cases

### Empty Input

- [ ] Gửi email rỗng → báo lỗi
- [ ] Gửi only newlines → báo lỗi

### Very Long Email List

- [ ] Nhập 50 emails hợp lệ → chấp nhận
- [ ] Nhập 51 emails → báo lỗi

### Special Characters in Email

- [ ] `test+tag@gmail.com` → chấp nhận
- [ ] `test@sub.domain.com` → chấp nhận
- [ ] `test@domain` → báo lỗi (no TLD)

### Concurrent Requests

- [ ] 2 users tạo order cùng lúc → cả 2 thành công
- [ ] 1 user tạo 2 order cùng lúc → chỉ 1 thành công

---

## 🚀 Deployment Test (Production)

### After Deploy

- [ ] Health check endpoint accessible
- [ ] Bot responds to commands
- [ ] Database connected
- [ ] Logs visible
- [ ] Webhook URL configured in SePay

### Full Flow Test

- [ ] Tạo order thực
- [ ] Thanh toán thực (small amount)
- [ ] Nhận thông báo
- [ ] Admin fulfill order
- [ ] User nhận kết quả

---

## 📝 Logs & Monitoring

### Development

```bash
npm run dev
```
- [ ] Logs hiển thị màu sắc (pino-pretty)
- [ ] Info, warn, error levels
- [ ] Timestamps

### Production

- [ ] JSON logs
- [ ] No sensitive data in logs
- [ ] Error stack traces

---

## ✅ Final Checklist

Before going live:

- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Environment variables set
- [ ] Database backed up
- [ ] Webhook URL configured
- [ ] Monitoring setup
- [ ] Admin notified

---

**Test completed:** _______________

**Tested by:** _______________

**Date:** _______________

**Issues found:** _______________

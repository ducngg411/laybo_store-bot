# 🚀 HƯỚNG DẪN CHẠY NHANH

## ⚡ Quick Start (5 phút)

### 1. Clone và cài đặt

```bash
cd "c:\laybo_store bot"
npm install
```

### 2. Cấu hình .env

Mở file `.env` và điền:

```env
BOT_TOKEN=<telegram_bot_token>
ADMIN_CHAT_ID=<your_telegram_chat_id>
DATABASE_URL=postgresql://user:password@localhost:5432/laybo_store
```

**Cách lấy thông tin:**

**BOT_TOKEN:**
1. Chat với [@BotFather](https://t.me/BotFather)
2. Gửi `/newbot`
3. Đặt tên bot
4. Copy token nhận được

**ADMIN_CHAT_ID:**
1. Chat với [@userinfobot](https://t.me/userinfobot)
2. Bot sẽ trả về ID của bạn
3. Hoặc tạo group, thêm bot vào, dùng getUpdates API

### 3. Setup Database

**Option A: PostgreSQL local**

```bash
# Windows (với PostgreSQL đã cài)
# Tạo database trong pgAdmin hoặc:
psql -U postgres
CREATE DATABASE laybo_store;
\q

# Cập nhật DATABASE_URL trong .env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/laybo_store
```

**Option B: Sử dụng cloud database (khuyến nghị cho test nhanh)**

- [Railway PostgreSQL](https://railway.app) - Free tier
- [Supabase](https://supabase.com) - Free tier
- [Neon](https://neon.tech) - Free tier

### 4. Chạy migrations & seed

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Khởi động ứng dụng

```bash
npm run dev
```

Bạn sẽ thấy:
```
✅ Database connected
🤖 Telegram bot started
🚀 Server listening on port 3000
⏰ Order expiry job started
✅ Application started successfully
```

### 6. Test bot

1. Mở Telegram
2. Tìm bot của bạn (theo username đã tạo)
3. Gửi `/start`
4. Chọn Canva hoặc Netflix

## 🎯 Test Flow Canva

1. `/start` → Chọn "🟦 Canva"
2. Chọn plan: "3 tháng - ₫140,000"
3. Chọn số lượng: "2"
4. Gửi danh sách email:
   ```
   test1@gmail.com
   test2@gmail.com
   ```
5. Nhận QR code thanh toán
6. Admin group nhận thông báo

## 🎬 Test Flow Netflix

1. `/start` → Chọn "🎬 Netflix"
2. Chọn plan: "1 tháng - ₫80,000"
3. Chọn số lượng: "1"
4. Nhận QR code
5. Sau khi "thanh toán" (test webhook), nhận tài khoản

## 🧪 Test Webhook (Local)

Để test webhook local, dùng ngrok:

```bash
# Cài ngrok
npm install -g ngrok

# Tạo tunnel
ngrok http 3000

# Copy HTTPS URL (vd: https://abc123.ngrok.io)
# Cấu hình trong SePay: https://abc123.ngrok.io/webhooks/sepay
```

**Test webhook với curl:**

```bash
curl -X POST http://localhost:3000/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TXN123456",
    "referenceCode": "REF123456",
    "transferAmount": 140000,
    "content": "Thanh toan ORD_xxxxxxxx FT25296041079708",
    "code": "ORD_xxxxxxxx",
    "gateway": "MB",
    "transactionDate": "2026-01-11T10:30:00Z",
    "transferType": "in"
  }'
```

**Notes:**
- Thay `ORD_xxxxxxxx` bằng order ID thực tế từ bot
- `transferType` phải là `"in"` (tiền vào)
- `transferAmount` phải >= tổng tiền đơn hàng

## 📊 Prisma Studio (Database GUI)

Xem và chỉnh sửa data trực tiếp:

```bash
npm run db:studio
```

Mở browser: http://localhost:5555

## ❓ Troubleshooting

### Bot không phản hồi?

```bash
# Check logs
# Nếu thấy lỗi "401 Unauthorized" → BOT_TOKEN sai
# Nếu thấy lỗi "Cannot find chat" → ADMIN_CHAT_ID sai
```

### Database error?

```bash
# Reset database
npm run db:migrate reset
npm run db:seed
```

### Port 3000 đã được sử dụng?

Đổi trong `.env`:
```env
PORT=3001
```

## 🎨 Thêm sản phẩm mới

### 1. Thêm vào database (Prisma Studio hoặc seed script)

```typescript
// prisma/seed.ts
const newProduct = await prisma.product.create({
  data: {
    code: 'SPOTIFY',
    name: 'Spotify Premium',
    type: ProductType.SERVICE,
    isActive: true,
  },
});

await prisma.variant.create({
  data: {
    productId: newProduct.id,
    code: 'SPOTIFY_1M',
    name: '1 tháng',
    durationMonths: 1,
    priceVnd: 60000,
    isActive: true,
  },
});
```

### 2. Thêm handler trong bot

Tạo `src/bot/handlers/spotify.handler.ts` tương tự như `canva.handler.ts`

### 3. Register trong bot index

```typescript
// src/bot/index.ts
import { handleSpotifySelect } from './handlers/spotify.handler';

bot.action(CALLBACK_ACTIONS.SELECT_SPOTIFY, handleSpotifySelect);
```

## 🚀 Deploy Production

### Railway (Khuyến nghị - easiest)

1. Push code lên GitHub
2. Vào [Railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Add PostgreSQL
5. Set environment variables
6. Deploy!

Railway tự động:
- Build TypeScript
- Run migrations
- Start app
- Tạo public URL

### Render

1. New Web Service
2. Connect GitHub
3. Build: `npm install && npm run db:migrate:deploy && npm run build`
4. Start: `npm start`

## 📝 Cấu trúc file quan trọng

```
src/
├── index.ts                    # Entry point
├── bot/
│   ├── index.ts               # Bot setup
│   └── handlers/
│       ├── canva.handler.ts   # Flow Canva
│       ├── netflix.handler.ts # Flow Netflix
│       └── order.handler.ts   # Xử lý đơn hàng
├── server/index.ts            # Webhook server
├── services/
│   ├── order.service.ts       # Business logic đơn hàng
│   └── payment.service.ts     # Xử lý webhook SePay
└── shared/
    ├── constants.ts           # Text, actions, limits
    └── config.ts              # Environment config
```

## 💡 Tips

1. **Development**: Dùng `npm run dev` với hot reload
2. **Database**: Dùng Prisma Studio để xem/sửa data
3. **Logs**: Check terminal để debug
4. **Test**: Test từng flow riêng lẻ trước
5. **Production**: Luôn backup database trước khi deploy

## 🆘 Cần hỗ trợ?

- Đọc [README.md](README.md) chi tiết
- Check logs trong terminal
- Liên hệ @ducngg411

---

Made with ❤️ for LayBo Store

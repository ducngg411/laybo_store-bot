# LayBo Store Bot

Telegram bot bán hàng tích hợp webhook SePay, hỗ trợ bán dịch vụ Canva và tài khoản Netflix.

## 📁 Cấu trúc thư mục

```
laybo-store-bot/
├── prisma/
│   ├── schema.prisma          # Prisma schema definition
│   ├── seed.ts                # Database seed script
│   └── migrations/            # Database migrations
├── src/
│   ├── bot/                   # Telegram bot logic
│   │   ├── handlers/          # Bot command & callback handlers
│   │   │   ├── start.handler.ts
│   │   │   ├── canva.handler.ts
│   │   │   ├── netflix.handler.ts
│   │   │   └── order.handler.ts
│   │   └── index.ts           # Bot initialization
│   ├── server/                # Web server for webhooks
│   │   └── index.ts           # Fastify server & webhook endpoint
│   ├── db/                    # Database layer
│   │   ├── client.ts          # Prisma client
│   │   └── repositories/      # Data access repositories
│   │       ├── product.repository.ts
│   │       ├── order.repository.ts
│   │       ├── payment.repository.ts
│   │       └── inventory.repository.ts
│   ├── services/              # Business logic
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   └── inventory.service.ts
│   ├── jobs/                  # Background jobs
│   │   └── order-expiry.job.ts
│   ├── shared/                # Shared utilities
│   │   ├── config.ts          # Environment configuration
│   │   ├── logger.ts          # Pino logger setup
│   │   ├── constants.ts       # App constants
│   │   ├── validators.ts      # Input validators
│   │   └── utils.ts           # Helper functions
│   └── index.ts               # Application entry point
├── .env                       # Environment variables (create from .env.example)
├── .env.example               # Example environment config
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Bắt đầu

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin của bạn:

```env
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_CHAT_ID=your_telegram_chat_id_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/laybo_store?schema=public

# SePay
SEPAY_WEBHOOK_SECRET=your_sepay_webhook_secret
BASE_URL=https://your-domain.com

# Application
ORDER_EXPIRE_MINUTES=15
NODE_ENV=development
PORT=3000
```

**Hướng dẫn lấy thông tin:**

- **BOT_TOKEN**: Tạo bot mới với [@BotFather](https://t.me/BotFather) trên Telegram
- **ADMIN_CHAT_ID**: 
  - Tạo một group chat
  - Thêm bot vào group
  - Thêm [@userinfobot](https://t.me/userinfobot) vào group để lấy Chat ID
  - Hoặc dùng: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
- **DATABASE_URL**: Connection string PostgreSQL của bạn

### 3. Thiết lập Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data (Canva & Netflix products)
npm run db:seed
```

### 4. Chạy ứng dụng

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## 📦 Sản phẩm mặc định

Sau khi chạy `npm run db:seed`, database sẽ có:

### Canva Pro (SERVICE)
- 1 tháng: 50,000 VNĐ
- 3 tháng: 140,000 VNĐ
- 6 tháng: 270,000 VNĐ
- 12 tháng: 500,000 VNĐ

### Netflix Premium (DIGITAL_GOOD)
- 1 tháng: 80,000 VNĐ

## 🔄 Workflow

### Flow Canva (SERVICE)
1. User chọn Canva → chọn plan (1M/3M/6M/12M)
2. Nhập số lượng email (1-50)
3. Gửi danh sách email (mỗi email 1 dòng)
4. Bot tạo đơn + gửi QR thanh toán
5. Webhook SePay xác nhận thanh toán
6. Bot thông báo admin
7. Admin xử lý → đánh dấu hoàn thành
8. User nhận thông báo hoàn thành

### Flow Netflix (DIGITAL_GOOD)
1. User chọn Netflix → chọn plan
2. Nhập số lượng tài khoản (1-20)
3. System check inventory
4. Bot tạo đơn + reserve inventory + gửi QR
5. Webhook SePay xác nhận thanh toán
6. System chuyển inventory → SOLD
7. Bot gửi tài khoản/mật khẩu cho user

## 🎯 Các tính năng chính

✅ **Quản lý đơn hàng**
- Ngăn user tạo nhiều đơn active cùng lúc
- Tự động expire đơn sau 15 phút (configurable)
- Release inventory khi đơn expire/cancel

✅ **Validation chặt chẽ**
- Email: format, không trùng, đúng số lượng
- Quantity: giới hạn theo từng loại sản phẩm

✅ **Idempotency webhook**
- Dùng `eventKey` unique để tránh xử lý trùng
- PaymentEvent table track tất cả webhook

✅ **Inventory management**
- Reserve → Sold workflow cho DIGITAL_GOOD
- Auto-release khi đơn expire

✅ **Admin tools**
- Nhận thông báo đơn mới
- Inline buttons cập nhật trạng thái
- Thông tin chi tiết đơn hàng

## 🔧 SePay Integration

**⚠️ QUAN TRỌNG:** Code hiện tại sử dụng mock QR code và giả định payload SePay.

Bạn cần điều chỉnh theo tài liệu SePay thực tế:

### 1. Webhook Payload

Chỉnh sửa interface trong [`src/services/payment.service.ts`](src/services/payment.service.ts):

```typescript
export interface SepayWebhookPayload {
  // Điều chỉnh theo spec của SePay
  transactionId?: string;
  amount: number;
  orderCode?: string;
  status?: string;
  // ... thêm các field khác
}
```

### 2. Signature Validation

Trong [`src/server/index.ts`](src/server/index.ts), thêm logic validate signature:

```typescript
// TODO: Uncomment and implement
if (config.sepay.webhookSecret) {
  const signature = request.headers['x-sepay-signature'];
  if (!validateSignature(payload, signature, config.sepay.webhookSecret)) {
    return reply.code(401).send({ error: 'Invalid signature' });
  }
}
```

### 3. QR Code Generation

Thay thế mock implementation trong `paymentService.generateQRCode()` bằng API call thực:

```typescript
async generateQRCode(paymentRef: string, amount: number): Promise<string> {
  // Call SePay API
  const response = await sepayApi.createPayment({
    orderCode: paymentRef,
    amount: amount,
    // ... other params
  });
  return response.qrUrl;
}
```

## 📊 Database Schema

### Các model chính:

- **Product**: Sản phẩm (Canva, Netflix)
- **Variant**: Các plan khác nhau (1M, 3M, ...)
- **Order**: Đơn hàng
- **PaymentEvent**: Lịch sử webhook
- **InventoryItem**: Kho hàng (Netflix accounts)

Xem chi tiết trong [`prisma/schema.prisma`](prisma/schema.prisma)

## 🛠️ Scripts NPM

```bash
npm run dev              # Chạy development với hot reload
npm run build            # Build TypeScript → JavaScript
npm start                # Chạy production build
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:migrate:deploy # Deploy migrations (production)
npm run db:seed          # Seed database
npm run db:studio        # Mở Prisma Studio
npm run lint             # Run ESLint
npm run format           # Format code với Prettier
```

## 🚀 Deployment

### Option 1: Railway

1. Tạo project mới trên [Railway](https://railway.app)
2. Add PostgreSQL database
3. Deploy from GitHub repo
4. Set environment variables
5. Railway tự động build và deploy

### Option 2: Render

1. Tạo Web Service mới trên [Render](https://render.com)
2. Connect GitHub repo
3. Add PostgreSQL database
4. Set environment variables:
   - Build Command: `npm install && npm run db:migrate:deploy && npm run build`
   - Start Command: `npm start`
5. Deploy

### Option 3: VPS (Ubuntu)

```bash
# Install Node.js & PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql

# Setup PostgreSQL
sudo -u postgres createdb laybo_store
sudo -u postgres psql -c "CREATE USER laybo WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE laybo_store TO laybo;"

# Clone & setup app
git clone <your-repo>
cd laybo-store-bot
npm install
npm run build

# Setup .env
nano .env  # Điền thông tin

# Run migrations & seed
npm run db:migrate:deploy
npm run db:seed

# Setup PM2 (process manager)
npm install -g pm2
pm2 start dist/index.js --name laybo-bot
pm2 save
pm2 startup  # Follow instructions
```

### Webhook URL

Sau khi deploy, cấu hình webhook URL trong SePay dashboard:

```
https://your-domain.com/webhooks/sepay
```

## 🔐 Security Notes

1. **Không commit `.env`** vào Git
2. Sử dụng **HTTPS** cho production
3. Validate **webhook signature** từ SePay
4. Giới hạn **rate limiting** nếu cần
5. Sử dụng **strong password** cho database

## 📝 Logs

Application sử dụng Pino logger:

- **Development**: Pretty-printed colorful logs
- **Production**: JSON logs (dễ parse với log aggregators)

## 🐛 Troubleshooting

### Bot không phản hồi

- Kiểm tra `BOT_TOKEN` đúng chưa
- Chạy `npm run dev` và xem logs

### Webhook không hoạt động

- Kiểm tra server có public URL chưa (dùng ngrok cho local test)
- Xem logs webhook trong SePay dashboard
- Check signature validation

### Database errors

- Chạy `npm run db:generate` sau khi thay đổi schema
- Chạy `npm run db:migrate` để apply migrations

## 📞 Support

Nếu cần hỗ trợ, liên hệ: @ducngg411

## 📄 License

ISC

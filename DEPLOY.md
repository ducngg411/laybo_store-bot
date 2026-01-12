# Hướng dẫn Deploy lên Fly.io

## Bước 1: Cài đặt Fly CLI

### Windows:
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### macOS/Linux:
```bash
curl -L https://fly.io/install.sh | sh
```

## Bước 2: Đăng nhập Fly.io

```bash
fly auth login
```

## Bước 3: Tạo PostgreSQL database trên Fly.io

```bash
# Tạo Postgres cluster
fly postgres create --name laybo-store-db --region sin

# Lưu lại thông tin connection string được hiển thị
```

## Bước 4: Tạo ứng dụng Fly.io

```bash
# Khởi tạo ứng dụng (file fly.toml đã được tạo sẵn)
fly apps create laybo-store-bot
```

## Bước 5: Gán database cho ứng dụng

```bash
# Attach database vào app
fly postgres attach laybo-store-db --app laybo-store-bot
```

Lệnh này sẽ tự động tạo biến môi trường `DATABASE_URL` cho app của bạn.

## Bước 6: Thiết lập các biến môi trường (secrets)

```bash
# Bot Token
fly secrets set BOT_TOKEN="your_telegram_bot_token" --app laybo-store-bot

# Admin Chat ID
fly secrets set ADMIN_CHAT_ID="your_admin_chat_id" --app laybo-store-bot

# Admin User ID
fly secrets set ADMIN_USER_ID="your_admin_user_id" --app laybo-store-bot

# SePay Configuration (nếu có)
fly secrets set SEPAY_WEBHOOK_SECRET="your_webhook_secret" --app laybo-store-bot
fly secrets set SEPAY_ACCOUNT_NUMBER="0123456789" --app laybo-store-bot
fly secrets set SEPAY_ACCOUNT_NAME="NGUYEN VAN A" --app laybo-store-bot
fly secrets set SEPAY_BANK_CODE="MB" --app laybo-store-bot

# Base URL (sau khi deploy lần đầu, sẽ là https://laybo-store-bot.fly.dev)
fly secrets set BASE_URL="https://laybo-store-bot.fly.dev" --app laybo-store-bot

# Other configs
fly secrets set ORDER_EXPIRE_MINUTES="2" --app laybo-store-bot
fly secrets set NODE_ENV="production" --app laybo-store-bot
```

## Bước 7: Deploy ứng dụng

```bash
fly deploy
```

## Bước 8: Kiểm tra trạng thái

```bash
# Kiểm tra status
fly status

# Xem logs
fly logs

# SSH vào máy
fly ssh console

# Mở dashboard
fly dashboard
```

## Bước 9: Scale (nếu cần)

```bash
# Tăng memory
fly scale memory 1024 --app laybo-store-bot

# Tăng số lượng instances
fly scale count 2 --app laybo-store-bot
```

## Các lệnh hữu ích khác

```bash
# Restart app
fly apps restart laybo-store-bot

# Xem thông tin app
fly info

# Chạy Prisma Studio (để quản lý database)
fly proxy 5555:5432 -a laybo-store-db
# Sau đó mở terminal khác và chạy: npm run db:studio

# Rollback về version trước
fly releases
fly deploy --image registry.fly.io/laybo-store-bot:deployment-<version>
```

## Troubleshooting

### Lỗi Database Connection
```bash
# Kiểm tra DATABASE_URL
fly ssh console -C "printenv DATABASE_URL"

# Restart database
fly postgres restart -a laybo-store-db
```

### Lỗi Build
```bash
# Build lại với log chi tiết
fly deploy --verbose

# Xóa build cache
fly deploy --no-cache
```

### Lỗi Migration
```bash
# SSH vào app và chạy migration thủ công
fly ssh console
cd /app
npm run db:migrate:deploy
```

## Chi phí ước tính

- **App (512MB RAM)**: ~$2-3/tháng
- **PostgreSQL (256MB)**: Miễn phí (Shared CPU)
- **Bandwidth**: 100GB miễn phí/tháng

## Lưu ý quan trọng

1. ✅ File `fly.toml` đã được cấu hình cho region Singapore (gần Vietnam nhất)
2. ✅ Dockerfile được tối ưu với multi-stage build
3. ✅ Auto-migrate database khi deploy
4. ✅ Health check endpoint tại `/health`
5. ⚠️  Nhớ thay đổi `app = 'laybo-store-bot'` trong `fly.toml` nếu app name khác
6. ⚠️  Backup database định kỳ: `fly postgres backup create -a laybo-store-db`

## Cập nhật sau khi deploy

Mỗi khi có thay đổi code, chỉ cần chạy:

```bash
fly deploy
```

Fly.io sẽ tự động build lại image và deploy version mới.

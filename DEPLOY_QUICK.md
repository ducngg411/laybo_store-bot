# 🚀 Deploy nhanh lên Fly.io

## Các bước thực hiện:

### 1️⃣ Cài đặt Fly CLI
```bash
# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2️⃣ Đăng nhập
```bash
fly auth login
```

### 3️⃣ Tạo database
```bash
fly postgres create --name laybo-store-db --region sin
```

### 4️⃣ Tạo app
```bash
fly apps create laybo-store-bot
```

### 5️⃣ Gán database
```bash
fly postgres attach laybo-store-db --app laybo-store-bot
```

### 6️⃣ Set secrets (thay thông tin của bạn)
```bash
fly secrets set BOT_TOKEN="your_bot_token_here" --app laybo-store-bot
fly secrets set ADMIN_CHAT_ID="your_chat_id" --app laybo-store-bot
fly secrets set ADMIN_USER_ID="your_user_id" --app laybo-store-bot
fly secrets set BASE_URL="https://laybo-store-bot.fly.dev" --app laybo-store-bot
```

### 7️⃣ Deploy!
```bash
fly deploy
```

### 8️⃣ Kiểm tra
```bash
fly logs
fly status
```

---

📖 **Xem hướng dẫn chi tiết tại [DEPLOY.md](DEPLOY.md)**

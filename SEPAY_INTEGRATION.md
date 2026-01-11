# SePay Integration Guide

Hướng dẫn tích hợp SePay webhook cho LayBo Store Bot.

---

## 📋 SePay Webhook Format

### Payload Structure

```json
{
  "id": "TXN123456789",
  "referenceCode": "REF987654321",
  "transferAmount": 140000,
  "content": "Thanh toan ORD_ABC12345 FT25296041079708",
  "description": "Payment for order",
  "code": "ORD_ABC12345",
  "gateway": "MB",
  "transactionDate": "2026-01-11T10:30:00.000Z",
  "transferType": "in"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Transaction ID (primary identifier) |
| `referenceCode` | string | ❌ | Alternative transaction ID |
| `transferAmount` | number | ✅ | Số tiền chuyển (VNĐ) |
| `content` | string | ❌ | Nội dung chuyển khoản (chứa mã đơn) |
| `description` | string | ❌ | Mô tả giao dịch |
| `code` | string | ❌ | Mã đơn hàng (nếu SePay parse được) |
| `gateway` | string | ❌ | Mã ngân hàng (MB, VCB, TCB, ACB, etc.) |
| `transactionDate` | string | ❌ | Thời gian giao dịch (ISO 8601) |
| `transferType` | string | ✅ | Loại giao dịch: **'in'** hoặc 'out' |

---

## 🔍 Payment Reference Extraction

Bot tự động extract mã đơn hàng theo thứ tự ưu tiên:

### 1. Field `code` (highest priority)

```json
{
  "code": "ORD_ABC12345"
}
```

### 2. Regex từ `content`

```json
{
  "content": "Thanh toan ORD_ABC12345 FT25296041079708"
}
```

**Pattern:** `/ORD_[A-Z0-9]{8,}/`

Ví dụ matches:
- ✅ `ORD_ABC12345`
- ✅ `ORD_XYZ98765`
- ✅ `Thanh toan ORD_TEST1234 something`
- ❌ `ORD_ABC` (quá ngắn)
- ❌ `ORDER_123` (sai format)

### 3. Regex từ `description` (fallback)

```json
{
  "description": "Payment for ORD_ABC12345"
}
```

---

## ✅ Validation Rules

Bot sẽ validate webhook theo các rules sau:

### 1. Transfer Type

```typescript
if (payload.transferType !== 'in') {
  return 400; // Only incoming transfers accepted
}
```

**Chỉ chấp nhận `transferType = 'in'` (tiền vào)**

### 2. Transfer Amount

```typescript
if (!payload.transferAmount) {
  return 400; // Missing transferAmount
}
```

**transferAmount là bắt buộc**

### 3. Amount Validation

```typescript
if (paidAmount < order.totalVnd) {
  logger.warn('Payment amount insufficient');
  // Still process but log the discrepancy
}
```

**Bot vẫn xử lý nếu thiếu tiền nhưng log warning**

### 4. Order Status

```typescript
if (order.status !== 'PENDING_PAYMENT') {
  return false; // Ignore webhook
}
```

**Chỉ xử lý đơn ở trạng thái PENDING_PAYMENT**

---

## 🔐 Idempotency

Bot ngăn xử lý trùng webhook bằng `eventKey`:

```typescript
// Generate eventKey from transaction ID
const eventKey = `sepay_${payload.id || payload.referenceCode}`;

// Check if already processed
const { created } = await paymentEventRepository.createIfNotExists({
  eventKey,
  raw: payload,
});

if (!created) {
  return 200; // Duplicate webhook, ignore
}
```

**Cơ chế:**
1. Mỗi webhook có `eventKey` unique
2. Insert vào `PaymentEvent` table
3. Nếu duplicate (constraint violation) → ignore
4. Response vẫn là `200 OK`

---

## 🔄 Processing Flow

```
1. Receive webhook POST /webhooks/sepay
   ↓
2. Validate transferType = 'in'
   ↓
3. Validate transferAmount exists
   ↓
4. Generate eventKey from id/referenceCode
   ↓
5. Check idempotency (PaymentEvent)
   ├─ Duplicate? → Return 200 OK (skip processing)
   └─ New? → Continue
   ↓
6. Extract paymentRef from content/code
   ├─ Priority 1: payload.code
   ├─ Priority 2: regex from content
   └─ Priority 3: regex from description
   ↓
7. Find order by paymentRef
   ├─ Not found? → Return 200 OK + log warning
   └─ Found? → Continue
   ↓
8. Validate order status = PENDING_PAYMENT
   ├─ Other status? → Return 200 OK (ignore)
   └─ Valid? → Continue
   ↓
9. Validate amount
   ├─ Insufficient? → Log warning but continue
   └─ Sufficient? → Continue
   ↓
10. Update order status → PAID
   ↓
11. Mark inventory as SOLD (if DIGITAL_GOOD)
   ↓
12. Notify user (Telegram message)
   ↓
13. Notify admin (Telegram message with details)
   ↓
14. Return 200 OK
```

---

## 🧪 Testing

### Test Script

```bash
node test-webhook.js <order_id> <amount>
```

**Example:**
```bash
node test-webhook.js ORD_ABC12345 140000
```

### Manual Test with curl

```bash
curl -X POST http://localhost:3000/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TXN123456",
    "referenceCode": "REF123456",
    "transferAmount": 140000,
    "content": "Thanh toan ORD_ABC12345 FT25296041079708",
    "code": "ORD_ABC12345",
    "gateway": "MB",
    "transactionDate": "2026-01-11T10:30:00.000Z",
    "transferType": "in"
  }'
```

### Expected Response

**Success:**
```json
{
  "success": true
}
```

**Status: 200 OK**

---

## 📝 Logs

Bot logs tất cả webhook activity với Pino logger:

### Received Webhook
```json
{
  "level": "info",
  "msg": "Received SePay webhook",
  "payload": { ... }
}
```

### Payment Processed
```json
{
  "level": "info",
  "msg": "Payment processed successfully",
  "orderId": "clx123...",
  "paymentRef": "ORD_ABC12345",
  "transactionId": "TXN123456",
  "amount": 140000,
  "gateway": "MB"
}
```

### Duplicate Webhook
```json
{
  "level": "info",
  "msg": "Duplicate webhook ignored",
  "eventKey": "sepay_TXN123456",
  "orderId": "clx123..."
}
```

### Errors
```json
{
  "level": "warn",
  "msg": "Payment amount insufficient",
  "orderId": "clx123...",
  "expected": 140000,
  "received": 100000,
  "difference": 40000
}
```

---

## 🚀 Production Setup

### 1. Configure SePay Webhook URL

Trong SePay dashboard, cấu hình:

```
Webhook URL: https://your-domain.com/webhooks/sepay
Method: POST
Content-Type: application/json
```

### 2. Test Webhook

SePay thường có test button trong dashboard. Click để gửi test webhook.

### 3. Monitor Logs

```bash
# Railway/Render
View logs in dashboard

# VPS
pm2 logs laybo-bot

# Check for
✅ "Received SePay webhook"
✅ "Payment processed successfully"
```

### 4. Verify Database

```sql
SELECT * FROM "PaymentEvent" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "Order" WHERE status = 'PAID' ORDER BY "updatedAt" DESC LIMIT 5;
```

---

## ⚠️ Common Issues

### Issue 1: Invalid Transfer Type

**Error:**
```json
{
  "error": "Only incoming transfers are accepted"
}
```

**Solution:**
- Check `transferType` field
- Must be `"in"`, not `"out"`

### Issue 2: Order Not Found

**Log:**
```
"Order not found for payment reference"
```

**Solutions:**
1. Verify order exists in database
2. Check `paymentRef` extraction regex
3. Ensure order code format matches: `ORD_XXXXXXXX`

### Issue 3: Duplicate Webhook

**Log:**
```
"Duplicate webhook ignored"
```

**This is normal!** SePay may retry webhooks. Bot handles this automatically.

### Issue 4: Amount Mismatch

**Log:**
```
"Payment amount insufficient"
```

**Solutions:**
1. Check if user paid correct amount
2. Verify order total in database
3. Bot still processes but logs warning

---

## 🔧 Customization

### Change Order Code Pattern

Edit [`src/services/payment.service.ts`](src/services/payment.service.ts):

```typescript
// Current pattern: ORD_XXXXXXXX
const match = content.match(/ORD_[A-Z0-9]{8,}/);

// Custom pattern example: CV + digits
const match = content.match(/CV\d+/);
```

### Add Signature Validation

Edit [`src/server/index.ts`](src/server/index.ts):

```typescript
if (config.sepay.webhookSecret) {
  const signature = request.headers['x-sepay-signature'] as string;
  
  // Implement signature validation
  const expectedSignature = crypto
    .createHmac('sha256', config.sepay.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return reply.code(401).send({ error: 'Invalid signature' });
  }
}
```

### Strict Amount Validation

Edit [`src/services/payment.service.ts`](src/services/payment.service.ts):

```typescript
// Current: log warning if insufficient
if (paidAmount < order.totalVnd) {
  logger.warn(...);
  // Still process
}

// Change to: reject if insufficient
if (paidAmount < order.totalVnd) {
  logger.error(...);
  return false; // Don't process
}
```

---

## 📊 Database Schema Impact

### PaymentEvent Table

Mỗi webhook tạo 1 record:

```sql
INSERT INTO "PaymentEvent" (
  id,
  orderId,
  provider,
  eventKey,
  raw,
  createdAt
) VALUES (
  'cly123...',
  'clx456...',
  'SEPAY',
  'sepay_TXN123456',
  '{"id":"TXN123456",...}',
  NOW()
);
```

### Order Table Updates

```sql
UPDATE "Order"
SET status = 'PAID',
    updatedAt = NOW()
WHERE id = 'clx456...';
```

### InventoryItem Table (Netflix only)

```sql
UPDATE "InventoryItem"
SET status = 'SOLD',
    orderId = 'clx456...',
    updatedAt = NOW()
WHERE id IN ('cli111...', 'cli222...');
```

---

## 🎯 Best Practices

1. **Always return 200 OK**
   - Even for duplicates, invalid orders
   - SePay will retry on non-200 responses

2. **Log everything**
   - Helps debug payment issues
   - Audit trail for accounting

3. **Idempotency is critical**
   - SePay may send same webhook multiple times
   - Never process same transaction twice

4. **Validate transferType**
   - Prevents processing refunds/withdrawals
   - Only accept 'in' transfers

5. **Monitor webhook health**
   - Set up alerts for failed webhooks
   - Check logs regularly

---

## 📞 Support

- **SePay Support:** Contact SePay for webhook issues
- **Bot Issues:** Check logs and refer to [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Admin Contact:** @ducngg411

---

Made with ❤️ for LayBo Store

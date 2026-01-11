# API Documentation

## Webhook Endpoints

### POST /webhooks/sepay

Nhận webhook từ SePay khi thanh toán thành công.

**Headers:**
```
Content-Type: application/json
X-SePay-Signature: <signature> (optional, if SePay provides)
```

**Request Body (SePay Format):**
```json
{
  "id": "TXN123456789",
  "referenceCode": "REF987654321",
  "transferAmount": 140000,
  "content": "Thanh toan ORD_ABC12345 FT25296041079708",
  "description": "Payment for order",
  "code": "ORD_ABC12345",
  "gateway": "MB",
  "transactionDate": "2026-01-11T10:30:00Z",
  "transferType": "in"
}
```

**Field Descriptions:**
- `id`: Transaction ID (primary identifier)
- `referenceCode`: Alternative transaction ID
- `transferAmount`: Số tiền chuyển (VNĐ)
- `content`: Nội dung chuyển khoản (chứa mã đơn hàng)
- `description`: Mô tả giao dịch
- `code`: Mã đơn hàng (nếu có sẵn)
- `gateway`: Mã ngân hàng (MB, VCB, TCB, ACB, etc.)
- `transactionDate`: Thời gian giao dịch (ISO 8601)
- `transferType`: Loại giao dịch - **MUST be 'in'** (tiền vào)

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK`: Webhook processed successfully (or duplicate)
- `400 Bad Request`: Missing required fields or invalid transferType
- `401 Unauthorized`: Invalid signature (if implemented)
- `500 Internal Server Error`: Processing error

**Payment Reference Extraction:**

Order code được extract theo thứ tự ưu tiên:
1. Field `code` (nếu có)
2. Regex từ `content`: `/ORD_[A-Z0-9]{8,}/`
3. Regex từ `description`: `/ORD_[A-Z0-9]{8,}/`

**Validation Rules:**
1. `transferAmount` is required
2. `transferType` must be 'in' (incoming transfer)
3. Amount must be >= order.totalVnd
4. Order must be in PENDING_PAYMENT status
5. Transaction ID (id or referenceCode) used for idempotency

**Idempotency:**
- Sử dụng `id` hoặc `referenceCode` làm `eventKey`
- Format: `sepay_<transactionId>`
- Webhook trùng lặp sẽ trả về `200 OK` nhưng không xử lý lại

**Processing Flow:**
1. Validate transferType (must be 'in')
2. Validate signature (if provided)
3. Check required fields (transferAmount)
4. Create PaymentEvent (idempotency check via eventKey)
5. Extract paymentRef from content/code
6. Find Order by paymentRef
7. Validate order status (must be PENDING_PAYMENT)
8. Validate amount (paidAmount >= totalVnd)
9. Update order to PAID
10. Mark inventory as SOLD (for DIGITAL_GOOD)
11. Send notifications to user & admin

---

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-11T10:30:00Z"
}
```

**Status Codes:**
- `200 OK`: Server is healthy

---

## Bot Commands

### /start

Hiển thị menu chính với các lựa chọn:
- 🟦 Canva
- 🎬 Netflix
- ☎️ Hỗ trợ

### /help

Hiển thị thông tin hỗ trợ.

### /cancel

Huỷ operation hiện tại (nếu có).

---

## Callback Actions

### Main Menu

- `select_canva`: Chọn mua Canva
- `select_netflix`: Chọn mua Netflix
- `support`: Xem thông tin hỗ trợ

### Canva Flow

- `canva_plan_<code>`: Chọn plan (VD: `canva_plan_CANVA_3M`)
- `canva_qty_<number>`: Chọn số lượng (VD: `canva_qty_3`)
- `canva_qty_custom`: Nhập số lượng tùy chỉnh

### Netflix Flow

- `netflix_plan_<code>`: Chọn plan (VD: `netflix_plan_NETFLIX_1M`)
- `netflix_qty_<number>`: Chọn số lượng (VD: `netflix_qty_2`)
- `netflix_qty_custom`: Nhập số lượng tùy chỉnh

### Order Actions

- `view_qr`: Xem lại QR code
- `cancel_order`: Huỷ đơn hàng
- `confirm_payment`: User xác nhận đã thanh toán (info only)

### Admin Actions

- `admin_in_progress_<orderId>`: Đánh dấu đơn đang xử lý
- `admin_fulfilled_<orderId>`: Hoàn thành đơn hàng
- `admin_failed_<orderId>`: Đánh dấu thất bại

---

## Service Layer APIs

### OrderService

#### createOrder(params)

Tạo đơn hàng mới.

**Parameters:**
```typescript
{
  userId: bigint;
  username?: string;
  productCode: string;      // "CANVA" | "NETFLIX"
  variantCode?: string;     // "CANVA_3M" | "NETFLIX_1M"
  quantity: number;
  metadata?: {
    emails?: string[];      // For Canva
    [key: string]: unknown;
  };
}
```

**Returns:**
```typescript
{
  id: string;
  userId: bigint;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPriceVnd: number;
  totalVnd: number;
  status: OrderStatus;
  paymentRef: string;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

**Throws:**
- `USER_HAS_ACTIVE_ORDER`: User đã có đơn active
- `PRODUCT_NOT_FOUND`: Sản phẩm không tồn tại
- `VARIANT_NOT_FOUND`: Variant không tồn tại
- `INSUFFICIENT_INVENTORY`: Không đủ hàng (Netflix)

---

#### getOrder(orderId)

Lấy thông tin đơn hàng.

**Returns:** `OrderWithDetails | null`

---

#### getActiveOrder(userId)

Lấy đơn hàng active của user.

**Returns:** `OrderWithDetails | null`

---

#### cancelOrder(orderId)

Huỷ đơn hàng.

**Throws:**
- `ORDER_NOT_FOUND`: Đơn không tồn tại
- `ORDER_CANNOT_BE_CANCELLED`: Đơn không ở trạng thái có thể huỷ

---

#### updateOrderStatus(orderId, status)

Cập nhật trạng thái đơn hàng.

**Parameters:**
- `orderId: string`
- `status: OrderStatus`

---

#### processExpiredOrders()

Xử lý các đơn hàng hết hạn (background job).

**Returns:** `number` - Số đơn đã expire

---

### PaymentService

#### processWebhook(payload)

Xử lý webhook từ SePay.

**Parameters:**
```typescript
{
  transactionId?: string;
  amount: number;
  orderCode?: string;
  paymentRef?: string;
  status?: string;
  [key: string]: unknown;
}
```

**Returns:** `boolean` - `true` nếu processed, `false` nếu duplicate/ignored

---

#### generateQRCode(paymentRef, amount)

Tạo QR code thanh toán.

**Parameters:**
- `paymentRef: string` - Mã đơn hàng
- `amount: number` - Số tiền

**Returns:** `string` - URL của QR code image

**Note:** Hiện tại dùng mock VietQR. Cần thay bằng API SePay thực tế.

---

### InventoryService

#### checkAvailability(productId, quantity)

Kiểm tra tồn kho.

**Returns:** `boolean`

---

#### getOrderItems(orderId)

Lấy inventory items của đơn hàng.

**Returns:** `InventoryItem[]`

---

#### parseItemPayload(item)

Parse payload của inventory item.

**Returns:**
```typescript
{
  username: string;
  password: string;
  expiryDate: string;
  [key: string]: unknown;
}
```

---

## Error Handling

Tất cả errors được log bằng Pino logger và trả về user-friendly messages.

### Common Error Messages (Tiếng Việt)

- "Bạn đang có đơn hàng active" → USER_HAS_ACTIVE_ORDER
- "Không đủ hàng" → INSUFFICIENT_INVENTORY
- "Đơn hàng không tìm thấy" → ORDER_NOT_FOUND
- "Email không hợp lệ" → Email validation failed
- "Số lượng không hợp lệ" → Quantity validation failed

---

## Rate Limits

**Current:** No rate limiting (suitable for low traffic)

**Future Considerations:**
- User: 10 requests/minute
- Webhook: 100 requests/minute
- Admin: Unlimited

---

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

**Required:**
- `BOT_TOKEN`
- `DATABASE_URL`
- `ADMIN_CHAT_ID`

**Optional:**
- `SEPAY_WEBHOOK_SECRET`
- `BASE_URL`
- `ORDER_EXPIRE_MINUTES` (default: 15)
- `PORT` (default: 3000)

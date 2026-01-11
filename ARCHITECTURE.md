# Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LAYBO STORE BOT                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   TELEGRAM   │ ◄─────► │     BOT      │ ◄─────► │   DATABASE   │
│    USERS     │         │  (Telegraf)  │         │  (Postgres)  │
└──────────────┘         └──────────────┘         └──────────────┘
                                │
                                │
                                ▼
                         ┌──────────────┐
                         │   SERVICES   │
                         │              │
                         │ • Order      │
                         │ • Payment    │
                         │ • Inventory  │
                         └──────────────┘
                                │
                                │
                                ▼
┌──────────────┐         ┌──────────────┐
│    SEPAY     │ ───────►│ WEB SERVER   │
│   WEBHOOK    │  POST   │  (Fastify)   │
└──────────────┘         └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ BACKGROUND   │
                         │    JOBS      │
                         │              │
                         │ • Expiry Job │
                         └──────────────┘
```

## Data Flow

### 1. Canva Purchase Flow

```
User → /start → Select Canva → Choose Plan → Input Quantity
  → Input Emails → Create Order → Generate QR → Show QR
  
SePay Webhook → Validate → Process Payment → Update Order (PAID)
  → Notify User → Notify Admin

Admin → Click "Fulfilled" → Update Order → Notify User (Success)
```

### 2. Netflix Purchase Flow

```
User → /start → Select Netflix → Choose Plan → Input Quantity
  → Check Inventory → Reserve Items → Create Order → Generate QR

SePay Webhook → Validate → Process Payment → Update Order (PAID)
  → Mark Inventory as SOLD → Deliver Accounts → Notify User
```

### 3. Order Expiry Flow

```
Background Job (every 1 min) → Find Expired Orders
  → Release Reserved Inventory → Update Order (EXPIRED)
  → (Optional) Notify User
```

## Components

### Bot Layer
- **handlers/**: Command & callback handlers
- **index.ts**: Bot initialization, middleware, error handling

### Server Layer
- **index.ts**: Fastify server, webhook endpoint, request validation

### Service Layer
- **order.service.ts**: Order creation, cancellation, status updates
- **payment.service.ts**: Webhook processing, QR generation
- **inventory.service.ts**: Stock checking, reservation, delivery

### Repository Layer
- **product.repository.ts**: Product & variant queries
- **order.repository.ts**: Order CRUD, active order checks
- **payment.repository.ts**: Payment event tracking (idempotency)
- **inventory.repository.ts**: Inventory management

### Shared
- **config.ts**: Environment variables
- **logger.ts**: Pino logger
- **constants.ts**: Messages, actions, limits
- **validators.ts**: Email & quantity validation
- **utils.ts**: Helper functions

## Database Schema

```
┌─────────────┐     ┌─────────────┐
│   Product   │────<│   Variant   │
│             │ 1:N │             │
│ • id        │     │ • id        │
│ • code      │     │ • code      │
│ • name      │     │ • name      │
│ • type      │     │ • price     │
└─────────────┘     └─────────────┘
       │                   │
       │ 1:N               │ 1:N
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│    Order    │────<│ PaymentEvent │
│             │ 1:N │              │
│ • id        │     │ • eventKey   │
│ • userId    │     │ • raw        │
│ • status    │     └──────────────┘
│ • metadata  │
│ • paymentRef│
└─────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│ InventoryItem│
│              │
│ • payload    │
│ • status     │
│ • orderId    │
└──────────────┘
```

## Security Considerations

1. **Webhook Validation**: Signature check (TODO: implement based on SePay spec)
2. **Idempotency**: PaymentEvent with unique eventKey prevents duplicate processing
3. **Order Constraints**: One active order per user
4. **Input Validation**: Strict email & quantity validation
5. **Database Transactions**: Atomic operations for inventory reservation

## Scalability Notes

Current implementation is optimized for **low traffic** as requested. For higher scale:

1. **Queue System**: Add Bull/BullMQ for webhook processing
2. **Caching**: Redis for active orders, product catalog
3. **Rate Limiting**: Implement user rate limits
4. **Database**: Connection pooling, read replicas
5. **Bot**: Switch from polling to webhook mode

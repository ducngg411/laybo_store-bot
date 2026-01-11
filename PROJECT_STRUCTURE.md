# 📁 Cấu trúc dự án LayBo Store Bot

```
laybo-store-bot/
│
├── 📄 package.json                 # Dependencies & scripts
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 .eslintrc.json               # ESLint rules
├── 📄 .prettierrc                  # Prettier formatting
├── 📄 .gitignore                   # Git ignore patterns
├── 📄 .env                         # Environment variables (DO NOT COMMIT)
├── 📄 .env.example                 # Example environment config
│
├── 📚 README.md                    # Main documentation
├── 📚 QUICKSTART.md                # Quick start guide
├── 📚 ARCHITECTURE.md              # Architecture overview
├── 📚 API.md                       # API documentation
├── 📚 CHANGELOG.md                 # Version history
├── 📚 PROJECT_STRUCTURE.md         # This file
│
├── 🧪 test-webhook.js              # Webhook testing script
│
├── 🗄️ prisma/
│   ├── schema.prisma               # Database schema definition
│   ├── seed.ts                     # Database seeding script
│   └── migrations/                 # Database migrations
│       └── .gitkeep
│
└── 💻 src/
    │
    ├── 📄 index.ts                 # 🚀 Application entry point
    │
    ├── 🤖 bot/                     # Telegram bot logic
    │   ├── index.ts                # Bot initialization & routing
    │   └── handlers/               # Bot handlers
    │       ├── start.handler.ts    # /start command, main menu
    │       ├── canva.handler.ts    # Canva purchase flow
    │       ├── netflix.handler.ts  # Netflix purchase flow
    │       └── order.handler.ts    # Order actions, admin controls
    │
    ├── 🌐 server/                  # Web server
    │   └── index.ts                # Fastify server & webhook endpoint
    │
    ├── 🗄️ db/                      # Database layer
    │   ├── client.ts               # Prisma client instance
    │   └── repositories/           # Data access repositories
    │       ├── product.repository.ts
    │       ├── order.repository.ts
    │       ├── payment.repository.ts
    │       └── inventory.repository.ts
    │
    ├── ⚙️ services/                # Business logic layer
    │   ├── order.service.ts        # Order creation, cancellation, expiry
    │   ├── payment.service.ts      # Webhook processing, QR generation
    │   └── inventory.service.ts    # Stock checking, item delivery
    │
    ├── ⏰ jobs/                    # Background jobs
    │   └── order-expiry.job.ts     # Order expiry checker (1 min interval)
    │
    └── 🔧 shared/                  # Shared utilities
        ├── config.ts               # Environment config (Zod validation)
        ├── logger.ts               # Pino logger setup
        ├── constants.ts            # Bot messages, actions, limits
        ├── validators.ts           # Email & quantity validators
        └── utils.ts                # Helper functions
```

---

## 📝 File Descriptions

### Root Files

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies, scripts, metadata |
| `tsconfig.json` | TypeScript compiler options |
| `.eslintrc.json` | Code linting rules |
| `.prettierrc` | Code formatting rules |
| `.gitignore` | Git exclusion patterns |
| `.env` | **SECRET** environment variables |
| `.env.example` | Example env config (safe to commit) |

### Documentation

| File | Content |
|------|---------|
| `README.md` | Full project documentation |
| `QUICKSTART.md` | 5-minute setup guide |
| `ARCHITECTURE.md` | System architecture & diagrams |
| `API.md` | API reference & endpoints |
| `CHANGELOG.md` | Version history |
| `PROJECT_STRUCTURE.md` | This file |

### Scripts

| File | Purpose |
|------|---------|
| `test-webhook.js` | Test SePay webhook locally |

### Prisma

| File/Folder | Purpose |
|-------------|---------|
| `schema.prisma` | Database models & relations |
| `seed.ts` | Initial data (products, variants) |
| `migrations/` | Database version control |

---

## 🔍 Source Code Structure

### Entry Point: `src/index.ts`

```
main()
  ├── connectDatabase()
  ├── createBot() → startBot()
  ├── createServer() → startServer()
  └── OrderExpiryJob.start()
```

### Bot Layer: `src/bot/`

**Responsibilities:**
- User interaction
- Command handling
- Callback query routing
- Session management

**Key Files:**
- `index.ts`: Bot setup, middleware, error handling
- `handlers/*.handler.ts`: Specific flow handlers

### Server Layer: `src/server/`

**Responsibilities:**
- HTTP server
- Webhook endpoint
- Request validation

**Key Files:**
- `index.ts`: Fastify setup, routes

### Database Layer: `src/db/`

**Responsibilities:**
- Prisma client
- Data access patterns
- Query building

**Pattern:** Repository pattern

**Files:**
- `client.ts`: Prisma instance
- `repositories/*.repository.ts`: Data access objects

### Service Layer: `src/services/`

**Responsibilities:**
- Business logic
- Transaction handling
- Service orchestration

**Key Services:**
- `order.service.ts`: Order lifecycle
- `payment.service.ts`: Payment processing
- `inventory.service.ts`: Stock management

### Jobs Layer: `src/jobs/`

**Responsibilities:**
- Background tasks
- Scheduled operations

**Key Jobs:**
- `order-expiry.job.ts`: Expire old orders

### Shared Layer: `src/shared/`

**Responsibilities:**
- Configuration
- Utilities
- Constants

**Key Files:**
- `config.ts`: Env validation
- `logger.ts`: Logging setup
- `constants.ts`: App-wide constants
- `validators.ts`: Input validation
- `utils.ts`: Helper functions

---

## 🔗 Dependencies Flow

```
index.ts
  │
  ├─→ bot/index.ts
  │     └─→ handlers/*.handler.ts
  │           └─→ services/*.service.ts
  │                 └─→ db/repositories/*.repository.ts
  │                       └─→ db/client.ts (@prisma/client)
  │
  ├─→ server/index.ts
  │     └─→ services/*.service.ts
  │           └─→ db/repositories/*.repository.ts
  │
  └─→ jobs/*.job.ts
        └─→ services/*.service.ts
              └─→ db/repositories/*.repository.ts
```

---

## 📦 Module Exports

### Config

```typescript
import { config } from './shared/config';
// config.bot.token
// config.database.url
// config.app.port
```

### Logger

```typescript
import { logger } from './shared/logger';
// logger.info()
// logger.error()
```

### Constants

```typescript
import { 
  PRODUCT_CODES,
  CALLBACK_ACTIONS,
  BOT_MESSAGES,
  LIMITS 
} from './shared/constants';
```

### Services

```typescript
import { orderService } from './services/order.service';
import { paymentService } from './services/payment.service';
import { inventoryService } from './services/inventory.service';
```

### Repositories

```typescript
import { orderRepository } from './db/repositories/order.repository';
import { productRepository } from './db/repositories/product.repository';
// ... etc
```

---

## 🎯 Adding New Features

### Add New Product Type

1. Update `prisma/schema.prisma` (if needed)
2. Add seed data in `prisma/seed.ts`
3. Create handler: `src/bot/handlers/{product}.handler.ts`
4. Register in `src/bot/index.ts`
5. Add constants in `src/shared/constants.ts`

### Add New Webhook Provider

1. Create service: `src/services/{provider}.service.ts`
2. Add endpoint in `src/server/index.ts`
3. Update env schema in `src/shared/config.ts`

### Add New Background Job

1. Create job: `src/jobs/{task}.job.ts`
2. Start in `src/index.ts`

---

## 🔐 Security Notes

**Never commit:**
- `.env` file
- Database credentials
- API keys/tokens
- Private keys

**Always gitignore:**
- `node_modules/`
- `dist/`
- `.env`
- `*.log`

---

## 📊 Code Metrics

| Layer | Files | Lines (approx) | Purpose |
|-------|-------|----------------|---------|
| Bot | 5 | 1,000 | User interaction |
| Server | 1 | 200 | Webhook handling |
| Services | 3 | 600 | Business logic |
| Repositories | 4 | 400 | Data access |
| Shared | 5 | 400 | Utilities |
| **Total** | **18** | **~2,600** | Core application |

---

## 🚀 Build Output

```
dist/
├── index.js
├── bot/
│   ├── index.js
│   └── handlers/
├── server/
│   └── index.js
├── services/
├── db/
├── jobs/
└── shared/
```

---

Made with ❤️ for LayBo Store

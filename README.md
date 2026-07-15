<div align="center">

# 🔗 Linkify

### Enterprise URL Shortener & Link Management API

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle&logoColor=white)](https://orm.drizzle.team/)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/NehanAhmed/linkify/pulls)

</div>

---

**Linkify** is a production-grade REST API for creating, managing, analysing, and securing shortened URLs at scale. Built by [Nehan Ahmed](https://github.com/NehanAhmed), it handles the complete link lifecycle — from creation with custom codes and password protection, through rich visit analytics (geo, device, browser, referrer), to scheduled expiry, automated health checks, and team collaboration via collections and tags.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **URL Shortening** | Auto-generated or custom short codes (3-16 chars) |
| **Password Protection** | bcrypt-hashed passwords with JWT access tokens |
| **Visit Analytics** | GeoIP, device type, OS, browser, referrer category, bot detection |
| **Collections** | Nested folders with drag-style reordering and public sharing |
| **Tags** | Colour-coded labels with bulk assignment |
| **Custom Domains** | Bring your own domain with DNS verification + SSL tracking |
| **QR Codes** | PNG/SVG generation with caching, optional logo embedding, and time-limited expiry |
| **Bulk Operations** | Tag, move, extend expiry, or delete multiple links at once |
| **CSV Import/Export** | Import up to 500 URLs; export visit logs as CSV |
| **Link Chaining** | Point short links to other short links (max 5 hops, cycle detection) |
| **Scheduled Links** | Set activation and expiry timestamps |
| **API Keys** | Scoped, IP-allowlisted programmatic access |
| **Role-Based Access** | User & admin roles with AAL2 (2FA) enforcement |
| **SSRF Protection** | Private IP blocking, DNS validation, domain blocklists |
| **Bot Detection** | User-Agent pattern matching blocks headless browsers & crawlers |
| **Billing** | Stripe-powered plans (Free, Pro, Enterprise) with usage quotas |
| **Audit Logging** | Full action trail for security and compliance |
| **Health Checks** | Automated link availability monitoring |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js >= 20 |
| **Language** | TypeScript |
| **Framework** | Express 5 |
| **Database** | PostgreSQL (Neon Serverless) |
| **ORM** | Drizzle ORM |
| **Cache** | Redis (ioredis) |
| **Auth** | Supabase Auth (JWT + JWKS) |
| **Payments** | Stripe |
| **Validation** | Zod |
| **Logging** | Pino |
| **Security** | Helmet, bcrypt, express-rate-limit, AES-256-GCM |
| **QR** | qrcode + sharp |
| **GeoIP** | geoip-lite |
| **Testing** | Vitest + supertest |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [pnpm](https://pnpm.io/) 10.x
- PostgreSQL database (or [Neon](https://neon.tech) serverless)
- (Optional) [Redis](https://redis.io/) for caching
- (Optional) [Stripe](https://stripe.com) account for billing

### Installation

```bash
# Clone the repository
git clone https://github.com/NehanAhmed/linkify.git
cd linkify

# Install dependencies
pnpm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database URL and other settings

# Push database schema
pnpm db:push

# Start development server (hot reload)
pnpm dev
```

The server will start on `http://localhost:3000` (or the port configured in `.env`).

### Quick Start — Create Your First Link

```bash
# Get a CSRF token (required for browser-based clients)
curl http://localhost:3000/api/auth/csrf-token

# With a valid JWT or API key:
curl -X POST http://localhost:3000/api/urls \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very-long-url"}'

# Response:
# {
#   "success": true,
#   "data": {
#     "code": "aB3xK9m",
#     "shortUrl": "http://localhost:3000/aB3xK9m",
#     "url": "https://example.com/very-long-url",
#     "visits": 0,
#     ...
#   }
# }

# Visit your short link:
curl -L http://localhost:3000/aB3xK9m
```

---

## 📋 Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled production server |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking (no emit) |
| `pnpm db:push` | Sync Drizzle schema to database |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:studio` | Launch Drizzle Studio |
| `pnpm db:seed` | Seed subscription plans |

---

## 📖 API Overview

| Prefix | Description |
|---|---|
| `GET /api/health` | Health check endpoint |
| `GET /api/auth/csrf-token` | CSRF token generation |
| `POST /api/auth/refresh` | JWT token refresh |
| `POST /api/auth/reset-password` | Password reset trigger |
| `GET /api/auth/me` | Current user profile |
| `POST /api/auth/api-keys` | Create API key |
| `GET /api/auth/api-keys` | List API keys |
| `POST /api/urls` | Create short URL |
| `GET /api/urls` | List URLs (filtered, sorted, paginated) |
| `GET /api/urls/:code` | Resolve and redirect |
| `GET /api/urls/:code/info` | URL metadata |
| `GET /api/urls/:code/visits` | Visit log |
| `GET /api/urls/:code/stats` | Analytics (hourly/daily aggregation) |
| `GET /api/urls/:code/visits/export` | CSV export of visits |
| `GET /api/urls/:code/qr` | QR code generation (cached, time-limited) |
| `POST /api/urls/:code/qr/regenerate` | Regenerate expired QR code |
| `POST /api/urls/:code/verify-password` | Password verification |
| `PATCH /api/urls/:code/settings` | Update link settings |
| `POST /api/collections` | Create collection |
| `GET /api/collections` | List collections |
| `POST /api/tags` | Create tag |
| `POST /api/domains` | Add custom domain |
| `GET /api/billing/plans` | List subscription plans |
| `GET /api/admin/dashboard` | Admin dashboard stats |

> **Full API documentation with request/response schemas and error codes**: [docs/API.md](./docs/API.md)

---

## 📁 Project Documentation

| Document | Description |
|---|---|
| [API.md](./docs/API.md) | Complete API reference — all routes, request/response schemas, error codes, authentication, database schema |
| [PROJECT.md](./docs/PROJECT.md) | In-depth project overview — architecture, features, tech stack, security, plans, structure |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👤 Author

Built with ❤️ by **Nehan Ahmed**

[![GitHub](https://img.shields.io/badge/GitHub-@NehanAhmed-181717?logo=github&logoColor=white)](https://github.com/NehanAhmed)

---

<div align="center">
  <sub>If you find this project useful, consider giving it a ⭐!</sub>
</div>

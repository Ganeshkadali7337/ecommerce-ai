# ShopAI — AI-Powered E-Commerce Platform

## Architecture

```
┌─────────────┐     ┌─────────────────────────────────────────────┐
│   Frontend  │────▶│               Backend (Express)              │
│  React/Vite │     └──────────────────┬──────────────────────────┘
└─────────────┘                        │
                      ┌────────────────┼────────────────┐
                      ▼                ▼                ▼
              ┌──────────────┐  ┌──────────┐  ┌─────────────┐
              │  PostgreSQL  │  │  MongoDB │  │    Redis    │
              │  (users,     │  │ (reviews,│  │  (cart,     │
              │  products,   │  │ activity)│  │  sessions,  │
              │  orders)     │  └──────────┘  │  cache)     │
              └──────────────┘                └─────────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
┌──────────────┐ ┌────────┐  ┌──────────┐
│Elasticsearch │ │ Qdrant │  │  MinIO   │
│  (search,    │ │(vector │  │ (images, │
│  autocomplete│ │  AI)   │  │ invoices)│
└──────────────┘ └────────┘  └──────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Fast, simple component model |
| Backend | Node.js + Express | Lightweight, fast JSON APIs |
| ORM | Prisma | Type-safe, readable schema migrations |
| Relational DB | PostgreSQL 15 | ACID, transactions for orders/payments |
| Document DB | MongoDB 6 | Flexible schema for reviews/activity |
| Cache/Session | Redis 7 | Sub-millisecond in-memory ops |
| Search | Elasticsearch 8 | Full-text, facets, autocomplete |
| Vector DB | Qdrant | Cosine similarity for AI recommendations |
| Object Store | MinIO | S3-compatible, self-hosted |
| AI | Anthropic Claude | Review summaries, chatbot |
| Payments | Stripe | Test mode integration |

## Setup

### 1. Clone and configure
```bash
git clone <repo-url>
cd ecommerce-ai
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and STRIPE_SECRET_KEY
```

### 2. Start everything
```bash
docker-compose up --build
```

### 3. Seed the database (after services start)
```bash
docker-compose exec backend npm run seed
```

### 4. Access
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| API Docs | http://localhost:5000/api-docs |
| MinIO Console | http://localhost:9001 |
| Elasticsearch | http://localhost:9200 |
| Qdrant | http://localhost:6333 |

## Build Parts

| Part | Branch | What |
|------|--------|------|
| 1 | part-1/project-setup | Docker infra + skeleton |
| 2 | part-2/auth | JWT auth + user management |
| 3 | part-3/products | Product catalog + MinIO images |
| 4 | part-4/cart-orders-payments | Redis cart + Stripe checkout |
| 5 | part-5/reviews-activity | MongoDB reviews + AI summaries |
| 6 | part-6/search | Elasticsearch search + filters |
| 7 | part-7/ai-features | Vector search + AI chatbot |
| 8 | part-8/seed-docs | Seed data + Swagger + PDF invoices |

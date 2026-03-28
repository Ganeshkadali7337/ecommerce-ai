# ShopAI — AI-Powered E-Commerce Platform

A full-stack e-commerce platform integrating 6 databases, AI-powered features, vector search, and real payment processing.

## Screenshots

### Home Page
![Home Page](frontend/screenshots/Screenshot%202026-03-28%20193351.png)

### Products Catalog
![Products](frontend/screenshots/Screenshot%202026-03-28%20193451.png)

### Product Detail & Similar Products
![Product Detail](frontend/screenshots/Screenshot%202026-03-28%20192707.png)

![Similar Products](frontend/screenshots/Screenshot%202026-03-28%20192722.png)

### Reviews & AI Summary
![Reviews](frontend/screenshots/Screenshot%202026-03-28%20192747.png)

### Cart
![Cart](frontend/screenshots/Screenshot%202026-03-28%20193534.png)

### Checkout with Stripe Payment
![Checkout](frontend/screenshots/Screenshot%202026-03-28%20193552.png)

### AI Shopping Assistant Chatbot
![Chatbot](frontend/screenshots/Screenshot%202026-03-28%20193617.png)

## Features

- **JWT Authentication** — register, login, role-based access (admin/customer)
- **Product Catalog** — categories, variants, image upload via MinIO
- **Shopping Cart** — Redis-backed, 24h TTL, survives page refresh
- **Checkout & Payments** — Stripe integration, order history, PDF invoices
- **Reviews** — MongoDB reviews with ratings, AI-generated summaries
- **Activity Tracking** — browsing history, click tracking
- **Full-Text Search** — Elasticsearch with typo tolerance, filters, autocomplete
- **Vector Search** — similar products via Qdrant embeddings (gemini-embedding-001)
- **AI Chatbot** — Gemini 2.5 Flash shopping assistant with guardrails
- **Customers Also Bought** — co-purchase recommendations from order history
- **Redis Caching** — product list/detail cached with invalidation on update
- **Rate Limiting** — 60 requests/min per IP via Redis
- **AI Cost Tracking** — token usage and USD cost logged per AI call

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
              │  (users,     │  │(reviews, │  │ (cart, cache│
              │  products,   │  │ activity,│  │  rate limit)│
              │  orders)     │  │ AI logs) │  └─────────────┘
              └──────────────┘  └──────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
┌──────────────┐ ┌────────┐  ┌──────────┐
│Elasticsearch │ │ Qdrant │  │  MinIO   │
│  (search,    │ │(vector │  │ (images, │
│  autocomplete│ │similar)│  │ invoices)│
└──────────────┘ └────────┘  └──────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Fast component model, HMR |
| Backend | Node.js + Express | Lightweight, fast JSON APIs |
| ORM | Prisma | Type-safe schema, migrations |
| Relational DB | PostgreSQL 15 | ACID compliance for orders/payments |
| Document DB | MongoDB 6 | Flexible schema for reviews and logs |
| Cache / Rate Limit | Redis 7 | Sub-millisecond in-memory ops, TTL support |
| Search | Elasticsearch 8 | Full-text, fuzzy matching, autocomplete |
| Vector DB | Qdrant | Cosine similarity for AI recommendations |
| Object Store | MinIO | S3-compatible, self-hosted |
| AI | Google Gemini 2.5 Flash | Review summaries, chatbot, embeddings |
| Payments | Stripe | Test mode card processing |

## Setup

### 1. Clone and configure
```bash
git clone <repo-url>
cd ecommerce-ai
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and STRIPE keys
```

### 2. Start everything
```bash
docker-compose up --build
```

### 3. Seed the database
```bash
# Wait for all services to start, then:
docker-compose exec backend node src/seed.js
```

### 4. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| API Docs (Swagger) | http://localhost:5000/api-docs |
| MinIO Console | http://localhost:9001 |
| Elasticsearch | http://localhost:9200 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

### 5. Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | alex@test.com | password123 |
| Admin | admin@test.com | password123 |

> Admin can create products and upload images via Swagger at `/api-docs`

## API Documentation

Full Swagger UI available at **http://localhost:5000/api-docs**

Key endpoints:
- `POST /api/auth/login` — get JWT token
- `GET /api/products` — list products (Redis cached)
- `POST /api/products` — create product (admin)
- `POST /api/products/{id}/image` — upload image (admin)
- `GET /api/search?q=hoodie` — full-text search
- `GET /api/search/autocomplete?q=ho` — autocomplete
- `POST /api/cart` — add to cart
- `POST /api/orders/checkout` — place order (Stripe)
- `GET /api/products/{id}/similar` — vector similarity
- `GET /api/orders/also-bought/{productId}` — co-purchase recs
- `POST /api/ai/chat` — AI shopping assistant
- `GET /api/reviews/{productId}/summary` — AI review summary
- `GET /api/ai/logs` — AI cost tracking logs

## Build History

| Part | Branch | What was built |
|------|--------|----------------|
| 1 | part-1/project-setup | Docker Compose, all 6 services, skeleton |
| 2 | part-2/auth | JWT auth, user registration/login |
| 3 | part-3/products | Product catalog, variants, MinIO image upload |
| 4 | part-4/cart-orders-payments | Redis cart, Stripe checkout, PDF invoices |
| 5 | part-5/reviews-activity | MongoDB reviews, activity tracking, AI summaries |
| 6 | part-6/search | Elasticsearch full-text search, filters, autocomplete |
| 7 | part-7/ai-features | Gemini chatbot, Qdrant vector search, AI cost logs |
| 8 | part-8/caching-rate-limiting | Redis caching, rate limiting, customers also bought |

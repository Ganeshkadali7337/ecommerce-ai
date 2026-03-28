# ShopAI — Project Overview

## What Is This?

ShopAI is a full-stack e-commerce platform built to demonstrate real-world engineering skills.
It's not a toy project — it uses the same stack that production companies like Amazon, Shopify,
and Uber use internally. Every database and service here has a specific job, and they all work
together to make a fast, intelligent shopping experience.

---

## The Stack at a Glance

```
User Browser
     │
     ▼
React Frontend (port 3000)
     │
     ▼
Express Backend (port 5000)
     │
     ├── PostgreSQL  ──── users, products, orders, payments
     ├── MongoDB     ──── reviews, user activity logs
     ├── Redis       ──── shopping cart, sessions, rate limiting, cache
     ├── Elasticsearch ── product search, filters, autocomplete
     ├── Qdrant      ──── AI vector search, similar products
     └── MinIO       ──── product images, PDF invoices
```

---

## Every Feature Explained

### 1. User Accounts (PostgreSQL + JWT)
Users can sign up and log in. Passwords are hashed with bcrypt — never stored as plain text.
After login, the user gets a JWT token. That token is sent with every request to prove who they are.
No session files, no cookies — stateless auth that scales horizontally.

**Why PostgreSQL:** User data needs strict consistency. You can't have two accounts with the same email,
a user can't have a negative balance — these are hard constraints that a relational database enforces.

---

### 2. Product Catalog (PostgreSQL)
Products have categories, variants (size, color, etc.), pricing, stock count, and images.
Admins can create/update products. Stock decrements automatically when an order is placed.

**Why PostgreSQL:** Products relate to categories, orders relate to products, payments relate to orders.
This web of relationships is exactly what SQL is built for — joins, foreign keys, and transactions.

---

### 3. Shopping Cart (Redis)
The cart lives in Redis, not in a database. When you add a product, it's saved instantly in memory.
It expires automatically after 24 hours of inactivity. Survives page refreshes because it's on the server.

**Why Redis:** A cart changes constantly — add, remove, update quantity. Doing that in PostgreSQL on
every click would be overkill. Redis does it in under 1ms. It's also perfect for TTL (time-to-live)
expiry which handles abandoned carts automatically.

---

### 4. Orders & Payments (PostgreSQL + Stripe)
When you checkout, the backend creates a Stripe Payment Intent (test mode — no real money moves).
An order is created in PostgreSQL in "pending" state. Once confirmed, stock decrements, cart clears,
and the order moves to "paid". Full order history is available to the user.

**Why Stripe:** Industry standard for payments. Test mode lets you simulate real transactions without
a real card. In production you'd flip one environment variable to go live.

---

### 5. PDF Invoice (MinIO + PDFKit)
Every completed order gets a PDF invoice generated on the server and stored in MinIO.
The user gets a download link on their order detail page.

**Why MinIO:** MinIO is S3-compatible object storage that runs locally in Docker. In production you'd
swap it for AWS S3 with zero code changes — just different environment variables.

---

### 6. Product Reviews (MongoDB)
Customers can leave star ratings, written reviews, and attach images. Reviews are stored in MongoDB
as documents — each review is a self-contained JSON object.

**Why MongoDB:** Reviews don't have a fixed structure. Some have images, some don't. Some have
sub-ratings (fit, quality, value), some don't. MongoDB's flexible schema handles this naturally
without needing database migrations every time the review format changes.

---

### 7. User Activity Tracking (MongoDB)
Every time a user views a product, searches for something, or clicks around, that event is logged
as a document in MongoDB. This feeds into the recommendation engine later.

**Why MongoDB:** Activity logs are append-only, high-volume, and schema-free. A user browsing
shoes generates different data than a user browsing electronics. MongoDB handles both.

---

### 8. AI Review Summaries (Anthropic Claude)
Instead of reading 200 reviews, the platform generates a one-line AI summary like
"Customers say it runs small and the quality is great for the price."
Claude reads the latest reviews for a product and summarizes the sentiment.

**Why this matters:** It's a real AI use case with clear value — saves users time and drives purchases.

---

### 9. Product Search (Elasticsearch)
Full-text search across product names and descriptions. Handles typos (searching "nikie" finds "Nike").
Filters by category, price range, and rating. Autocomplete suggestions as you type.

**Why Elasticsearch:** PostgreSQL's LIKE query is slow and dumb. Elasticsearch is purpose-built for
text search — it understands relevance, handles partial matches, and returns results in milliseconds
even across millions of products.

---

### 10. AI Semantic Search (Qdrant + Embeddings)
Regular search finds exact words. Semantic search understands meaning. Searching "something to wear
in rain" finds "waterproof jacket" even though those words don't match.

Products are converted to vector embeddings (arrays of numbers that represent meaning). Qdrant
stores these vectors and finds the most similar ones using cosine similarity.

**Why this matters:** This is how modern AI-powered search works. Same technology behind
Spotify's "Discover Weekly", Netflix recommendations, and Google's semantic search.

---

### 11. "Find Similar Products" (Qdrant)
On every product page, the platform suggests similar products using the same vector embeddings.
Not "same category" similar — actually semantically similar based on description and attributes.

---

### 12. AI Shopping Assistant Chatbot (Claude)
A chat widget where users can ask questions like "What's a good gift under $50 for a runner?"
The chatbot searches products semantically and responds with actual recommendations from the catalog.
It also tracks AI API cost per session so you can see what each conversation costs.

---

### 13. "Customers Also Bought" (Qdrant)
Based on order co-occurrence — products that are frequently bought together get linked.
Stored as vectors so the lookup is instant.

---

### 14. Rate Limiting (Redis)
Every API endpoint is rate-limited per user. If someone hammers the API (or tries to brute-force
login), they get blocked after too many requests. Counter resets automatically after a time window.

**Why Redis:** Rate limiting needs an atomic counter that resets on a timer. Redis's INCR and EXPIRE
commands do exactly this in a single operation. Doing it in PostgreSQL would create a hot table.

---

### 15. Product Caching (Redis)
Frequently accessed products are cached in Redis. The first request hits PostgreSQL, the result
is stored in Redis for 10 minutes. All subsequent requests for that product are served from memory.
When an admin updates a product, the cache is invalidated immediately.

---

### 16. Product Image Upload (MinIO)
Admins can upload product images. Images are stored in MinIO and served publicly via URL.
The image URL is saved on the product record in PostgreSQL.

---

### 17. API Documentation (Swagger)
Every API endpoint is documented at http://localhost:5000/api-docs. You can read what each
endpoint does, what parameters it takes, and test it directly in the browser with a UI.

---

### 18. Seed Data
50 products across multiple categories, 200 reviews, and 10 test users are pre-loaded.
You don't need to manually create anything to demo the platform.

---

### 19. AI Cost Logging
Every call to the Claude API logs the model used, tokens consumed, and estimated cost.
There's an endpoint to see total AI spend per user session. Useful for budget tracking in production.

---

## Build Roadmap (8 Parts)

| Part | Branch | What Gets Built |
|------|--------|-----------------|
| 1 | `part-1/project-setup` | Docker infra, all services, skeleton apps |
| 2 | `part-2/auth` | Register, login, JWT auth, protected routes |
| 3 | `part-3/products` | Product catalog, categories, variants, MinIO images |
| 4 | `part-4/cart-orders-payments` | Redis cart, Stripe checkout, orders, PDF invoices |
| 5 | `part-5/reviews-activity` | MongoDB reviews, activity tracking, AI summaries |
| 6 | `part-6/search` | Elasticsearch search, filters, autocomplete |
| 7 | `part-7/ai-features` | Vector search, AI chatbot, recommendations, cost tracking |
| 8 | `part-8/seed-docs` | 50 products, 200 reviews, rate limiting, caching, final polish |

---

## Why Each Database — Quick Reference

| Database | Used For | Why Not Just Use PostgreSQL? |
|----------|----------|------------------------------|
| PostgreSQL | Users, products, orders | Needs strict schema, relations, transactions |
| MongoDB | Reviews, activity logs | Schema-free, high-volume writes, flexible structure |
| Redis | Cart, cache, rate limiting | In-memory speed, TTL support, atomic counters |
| Elasticsearch | Search, autocomplete | Full-text relevance, fuzzy matching, filters at scale |
| Qdrant | AI similarity search | Cosine similarity on vectors, ML-native storage |
| MinIO | Images, PDFs | Binary file storage, S3-compatible, serves via URL |

---

## Ports Reference

| Service | Port | Access |
|---------|------|--------|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 5000 | http://localhost:5000 |
| Swagger Docs | 5000 | http://localhost:5000/api-docs |
| PostgreSQL | 5432 | Internal only |
| MongoDB | 27017 | Internal only |
| Redis | 6379 | Internal only |
| Elasticsearch | 9200 | http://localhost:9200 |
| Qdrant | 6333 | http://localhost:6333 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |

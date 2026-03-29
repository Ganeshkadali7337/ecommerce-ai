# ShopAI — Complete Architecture & Study Guide
# Interview Preparation Document

---

## 1. THE BIG PICTURE

```
User Browser (React)
       ↕  HTTP/REST
Express Backend (Node.js) on Vercel / Docker
       ↕
┌──────────────────────────────────────────────┐
│  PostgreSQL  │  MongoDB  │  Redis             │
│  (users,     │  (reviews,│  (cart, cache,     │
│  products,   │  activity,│  rate limit)       │
│  orders)     │  AI logs) │                    │
└──────────────────────────────────────────────┘
       ↕
┌──────────────────────────────────────────────┐
│ Elasticsearch │  Qdrant  │  MinIO/Cloudinary  │
│ (search,      │ (vector  │  (images, PDFs)    │
│  autocomplete)│  AI)     │                    │
└──────────────────────────────────────────────┘
       ↕
   Google Gemini AI (summaries, chat, embeddings)
   Stripe (payments)
```

**Why so many databases?**
Each database is optimized for one specific thing. Using one DB for everything would be slow and wrong. This is the real world — production apps use multiple databases.

---

## 2. WHY EACH DATABASE

### PostgreSQL
- **What**: Traditional relational database with tables, rows, foreign keys, transactions.
- **Why here**: Users, products, orders, payments need **ACID compliance** — if a payment fails halfway, you don't want half an order created. PostgreSQL guarantees atomicity. Relations between users→orders→products are also natural with SQL.
- **Managed by**: **Prisma ORM** — instead of writing raw SQL, you write JavaScript. Prisma generates type-safe queries and handles migrations (schema changes).

```javascript
// Prisma schema (backend/prisma/schema.prisma)
model User {
  id       String  @id @default(uuid())
  email    String  @unique
  password String
  role     String  @default("customer") // admin or customer
  orders   Order[]
}

model Product {
  id          String     @id @default(uuid())
  name        String
  price       Float
  stock       Int
  rating      Float      @default(0)
  imageUrl    String?
  categoryId  String
  category    Category   @relation(fields: [categoryId], references: [id])
  variants    Variant[]
  orderItems  OrderItem[]
}

model Order {
  id         String      @id @default(uuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  total      Float
  status     String      @default("pending") // pending/paid/shipped/cancelled
  items      OrderItem[]
  payment    Payment?
  invoiceUrl String?
}
```

---

### MongoDB
- **What**: NoSQL document database. Stores JSON-like documents. No fixed schema.
- **Why here**: Reviews don't have a fixed structure (some have images, some don't, some have titles). Activity logs can have any metadata. MongoDB handles **flexible, schema-less data** naturally. Also great for write-heavy workloads.
- **Managed by**: **Mongoose** — ODM (Object Document Mapper) for MongoDB in Node.js.

```javascript
// Review model (backend/src/models/Review.js)
const ReviewSchema = new mongoose.Schema({
  productId: String,   // links to PostgreSQL product ID
  userId:    String,   // links to PostgreSQL user ID
  userName:  String,
  rating:    Number,   // 1-5
  title:     String,
  body:      String,
  images:    [String], // array of image URLs
  createdAt: { type: Date, default: Date.now }
});
```

---

### Redis
- **What**: In-memory key-value store. Blazing fast (microseconds). Data lives in RAM.
- **Why here**: Three uses:
  1. **Cart storage** — cart changes frequently, needs instant reads/writes, expires after 24h
  2. **API caching** — product list cached for 5 minutes so PostgreSQL isn't hit every request
  3. **Rate limiting** — counts requests per IP in real-time

```javascript
// Cart stored as JSON string with 24h expiry
await redis.setex(`cart:${userId}`, 86400, JSON.stringify(cartData));

// Product cache with 5min expiry
await redis.setex(`products:list:all:1:20`, 300, JSON.stringify(result));

// Rate limiting: 60 requests per 60 seconds per IP
// Handled automatically by rate-limiter-flexible library
```

---

### Elasticsearch
- **What**: Search engine built on Apache Lucene. Indexes data and makes it searchable with full-text search, fuzzy matching, filters.
- **Why here**: PostgreSQL `LIKE '%hoodie%'` is slow and can't handle typos. Elasticsearch finds "hoodie" even if you type "hoodiee" (`fuzziness: AUTO`). Also supports faceted filters in a single query.

```javascript
// Search query sent to Elasticsearch
{
  query: {
    bool: {
      must: [{
        multi_match: {
          query: "hoodie",
          fields: ["name^3", "description", "category"], // name weighted 3x
          fuzziness: "AUTO" // handles typos
        }
      }],
      filter: [
        { term: { category: "hoodies" }},           // category filter
        { range: { price: { gte: 20, lte: 100 }}},  // price range filter
        { range: { rating: { gte: 4 }}}              // rating filter
      ]
    }
  }
}
```

---

### Qdrant
- **What**: Vector database. Stores mathematical representations (embeddings) of text as arrays of numbers. Finds similar items by measuring distance between vectors.
- **Why here**: To answer "find products similar to this one." Regular databases can't do similarity search. Qdrant uses **cosine similarity** — products whose descriptions are semantically similar get high scores.

```
How it works:
1. Each product's text (name + description + category)
   is converted to a 3072-dimension vector by Gemini AI
   e.g. "Nike Running Shoes" → [0.123, -0.456, 0.789, ...] (3072 numbers)
2. That vector is stored in Qdrant with the product ID
3. When finding similar products:
   - Convert current product text to a vector
   - Ask Qdrant: "find me the 5 nearest vectors"
   - Qdrant returns IDs of most similar products
4. Fetch those products from PostgreSQL
```

---

### MinIO (Docker) / Cloudinary (Vercel)
- **What**: Object storage (like Amazon S3). Stores binary files — images, PDFs.
- **Why here**: You can't store images in PostgreSQL (too big, too slow). Object storage gives each file a URL and streams it efficiently.
- **MinIO** = self-hosted S3-compatible storage, runs in Docker
- **Cloudinary** = cloud image/file hosting, used on Vercel since MinIO needs a running server

---

## 3. AUTHENTICATION FLOW (JWT)

**What is JWT**: JSON Web Token. A signed string that proves who you are. No server-side sessions needed.

**Structure**: `header.payload.signature`
```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJjdXN0b21lciJ9.abc123
```
Decoded payload: `{ id: "user-uuid", role: "customer", exp: 1234567890 }`

### Registration Flow
```
User fills form → POST /api/auth/register
Payload: { name, email, password }

Backend:
1. Check if email already exists in PostgreSQL
2. Hash password with bcrypt (cost factor 10)
   "password123" → "$2b$10$abc...xyz" (irreversible, one-way)
3. Create user in PostgreSQL via Prisma
4. Sign JWT: jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' })
5. Return: { token, user: { id, name, email, role } }

Frontend (AuthContext.jsx):
- Store token in localStorage
- Set axios default header: Authorization: Bearer <token>
- Store user object in React state (globally available)
```

### Login Flow
```
User fills form → POST /api/auth/login
Payload: { email, password }

Backend:
1. Find user by email in PostgreSQL
2. bcrypt.compare(inputPassword, hashedPassword) → true/false
3. If match: sign new JWT, return it
4. If no match: 401 Unauthorized

Frontend: same as registration — store token, set header
```

### Auth Middleware (protects routes)
```javascript
// backend/src/middleware/auth.js
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer xyz" → "xyz"
  const decoded = jwt.verify(token, JWT_SECRET); // throws if invalid/expired
  req.user = decoded; // { id, role } now available in route handler
  next();
}

// Usage on protected routes:
router.post('/api/cart', auth, async (req, res) => {
  const userId = req.user.id; // guaranteed to be a real user
});
```

### How Frontend Maintains Auth
```javascript
// AuthContext.jsx — wraps entire app
// On app load, restores session from localStorage:
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.Authorization = `Bearer ${token}`;
  const { data } = await api.get('/api/auth/me'); // verify token still valid
  setUser(data);
}
// Logout: remove from localStorage, clear axios header, setUser(null)
```

---

## 4. PAGE-BY-PAGE FLOW WITH APIS

### Home Page (`/`)
**Shows**: Welcome banner, category list, 4 featured products

```
GET /api/products/meta/categories
→ Returns: [{ id, name, slug }, ...]
→ PostgreSQL: SELECT * FROM categories
→ Shown as: category pills/buttons

GET /api/products?limit=4
→ Check Redis cache: "products:list:all:1:4"
→ Cache HIT: return immediately (no DB call)
→ Cache MISS: PostgreSQL query → store in Redis 5min → return
→ Shown as: "Latest Products" grid
```

---

### Products Page (`/products`)
**Shows**: Sidebar with filters, product grid, pagination

```
GET /api/products/meta/categories   (for sidebar category list)

GET /api/products?page=1&limit=20&category=hoodies&minPrice=20&maxPrice=100&minRating=4
→ Backend builds Prisma WHERE:
  {
    category: { slug: "hoodies" },
    price: { gte: 20, lte: 100 },
    rating: { gte: 4 }
  }
→ Prisma: findMany({ where, skip: 0, take: 20 }) + count({ where })
→ Cache key includes all params
→ Returns: { products: [...], total: 45, page: 1, pages: 3 }

Pagination: skip = (page-1) * limit
Page 1: skip=0, Page 2: skip=20, Page 3: skip=40
```

---

### Product Detail Page (`/products/:id`)
**Shows**: Image, price, description, variants, Add to Cart, Similar Products, Also Bought, Reviews

```
1. GET /api/products/:id
   → Redis check: "products:single:{id}"
   → Cache MISS: PostgreSQL with category + variants included
   → If user logged in: log view to MongoDB ActivityLog
   → Returns full product object

2. GET /api/products/:id/similar   (SimilarProducts component)
   → Gemini embedding-001: generate 3072-dim vector for product text
   → Qdrant: find 5 nearest vectors (excluding current product)
   → Fetch those products from PostgreSQL
   → Fallback: same-category products if AI fails

3. GET /api/orders/also-bought/:id   (AlsoBought component)
   → PostgreSQL: find all orders containing this product
   → Find all OTHER items in those orders
   → Count co-occurrences, rank by frequency
   → Return top 4 products
   → Shows nothing if no orders exist yet

4. GET /api/reviews/:id   (Reviews component)
   → MongoDB: Review.find({ productId }).sort(-createdAt).limit(20)
   → Returns: { reviews: [...], avgRating: 4.2, total: 18 }

Add to Cart:
POST /api/cart
Payload: { productId, quantity: 2 }
Auth: required (JWT)
→ redis.get("cart:{userId}") → parse JSON
→ Find product in cart, update qty OR add new entry
→ Fetch CURRENT price from PostgreSQL (security!)
→ Recalculate total
→ redis.setex("cart:{userId}", 86400, JSON.stringify(cart))
```

---

### Cart Page (`/cart`)
**Shows**: Items with qty controls, order summary, Checkout button

```
GET /api/cart
→ redis.get("cart:{userId}")
→ For each item: fetch product details from PostgreSQL
→ Returns: { items: [{ productId, quantity, product }], total }

PUT /api/cart/:productId
Payload: { quantity: 3 }
→ Update qty in Redis cart, recalculate total

DELETE /api/cart/:productId
→ Remove item from Redis cart array, recalculate total
```

---

### Checkout & Payment Flow (`/checkout`)
**Shows**: Address form, Stripe card input, order summary, Pay button

```
STEP 1 — User clicks "Pay $89.99"

STEP 2 — Frontend calls backend:
POST /api/orders/checkout
Backend:
  1. Get cart from Redis
  2. Fetch CURRENT prices from PostgreSQL (never trust cart prices — security)
  3. Create Order in PostgreSQL (status: "pending")
  4. Create Payment record (status: "pending")
  5. stripe.paymentIntents.create({ amount: 8999, currency: "usd" })
     → Stripe returns: clientSecret (one-time key for this payment)
  6. Return: { clientSecret, order: { id } }

STEP 3 — Frontend calls Stripe DIRECTLY (not your server):
stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name, email }
  }
})
→ Stripe validates card number, expiry, CVC
→ Charges the card
→ Returns: { paymentIntent: { status: "succeeded" } }

STEP 4 — Frontend tells backend payment worked:
POST /api/orders/:id/confirm
Backend:
  1. Verify with Stripe: stripe.paymentIntents.retrieve(id) → must be "succeeded"
  2. Update Order status → "paid" in PostgreSQL
  3. Update Payment status → "paid"
  4. Decrement product stock
  5. Clear Redis cart: redis.del("cart:{userId}")
  6. Generate PDF invoice with PDFKit
  7. Upload PDF to MinIO (Docker) or Cloudinary (Vercel)
  8. Save invoice URL on Order record
  9. Return: { order }

STEP 5 — Frontend redirects to /orders/:id

Test cards:
  4242 4242 4242 4242 — always succeeds
  4000 0000 0000 0002 — always declines
  Any future date, any CVC, any ZIP
```

**Why two-step payment?**
Security. If frontend just said "I paid!", anyone could fake it. Backend verifies directly with Stripe server-to-server before marking order as paid.

---

### Search Page (`/search?q=hoodie`)
**Shows**: Filter sidebar, search results

```
GET /api/search?q=hoodie&minPrice=20&maxPrice=100&minRating=4&category=hoodies
→ Elasticsearch query with fuzzy matching + all filters
→ Results ranked by relevance score (name matches weighted 3x)
→ Returns: { products: [...], total: 11 }

GET /api/search/autocomplete?q=ho
→ Elasticsearch: match "ho" across name + category fields
→ Returns top 6: [{ id, name, category }, ...]
→ Frontend debounces 250ms (waits before calling API)
→ Dropdown closes on outside click
```

**How ES knows about products**:
When admin creates/updates a product, backend ALSO indexes it in ES:
```javascript
await esClient.index({
  index: 'products',
  id: product.id,
  body: { name, description, category: category.name, price, rating }
});
```
Seed script indexes all 50 products on first run.

---

### Reviews Section (on Product Detail)
**Write a Review**:
```
POST /api/reviews/:productId  (multipart/form-data — supports file upload)
Payload: { rating, title, body, userName, images[] (optional, max 3) }
Auth: required

Backend:
  1. await connectMongo() — ensure DB connected (important on Vercel)
  2. If images: uploadFile() → MinIO (Docker) or Cloudinary (Vercel)
  3. Review.create({ productId, userId, userName, rating, title, body, images })
  4. Return saved review
```

**AI Summary Button**:
```
GET /api/reviews/:productId/summary

Backend:
  1. MongoDB: fetch last 30 reviews
  2. Format: "5/5: Great product\n3/5: Runs small..."
  3. Gemini 2.5 Flash:
     prompt: "Summarize in one sentence like 'Customers say it...'"
  4. Calculate cost: inputTokens × $0.075/1M + outputTokens × $0.30/1M
  5. Log to MongoDB AiLog
  6. Return: { summary: "Customers say it runs small but looks great", cost: 0.000045 }
```

---

### AI Chatbot (ChatWidget — floats on all pages)
```
POST /api/ai/chat
Payload: { message: "I need running shoes under $100" }

Backend:
  1. await connectMongo()
  2. Elasticsearch: search for products matching the message
  3. Build context for Gemini:
     systemPrompt: "You are ShopAI shopping assistant.
     Only discuss products. Keep responses 2-3 sentences.
     Available products: Nike Air Max $89.99, Adidas Run $79.99..."
  4. Gemini 2.5 Flash generates response
  5. Log cost to MongoDB AiLog
  6. Return: { reply: "Based on your budget...", cost, tokensUsed }
```

---

### Orders Page (`/orders`)
```
GET /api/orders
→ PostgreSQL: all orders for logged-in user, with items + payment
→ Sorted by date descending

GET /api/orders/:id
→ Full order with all items, prices, status, invoiceUrl
→ Frontend shows "Download Invoice" button if invoiceUrl present
```

---

## 5. AI INTEGRATIONS DEEP DIVE

### Google Gemini — 3 Different Uses

**1. Review Summaries** (`gemini-2.5-flash`)
- Input: up to 30 reviews as plain text
- Output: one-sentence summary starting with "Customers say it..."
- Called only when user clicks "AI Summary" button (not automatic)

**2. Shopping Chatbot** (`gemini-2.5-flash`)
- Input: user message + relevant products from Elasticsearch injected as context
- Output: 2-3 sentence shopping advice mentioning real products
- Guardrails in system prompt: restricted to shopping topics only

**3. Product Embeddings** (`gemini-embedding-001`)
- Input: product text (name + description + category combined)
- Output: 3072-dimension vector array
- Called during: seed (all 50 products) + new product creation
- Stored in: Qdrant vector database

### Why Gemini over OpenAI?
- Free tier is more generous
- `gemini-embedding-001` produces high-quality 3072-dim vectors
- `gemini-2.5-flash` is fast and very cheap (~$0.075 per million input tokens)

### AI Cost Tracking
```javascript
// Every AI call logs to MongoDB:
AiLog.create({
  type: 'chat',           // or 'summary', 'embedding'
  prompt: message,
  response: reply,
  model: 'gemini-2.5-flash',
  tokensUsed: 450,
  cost: 0.000045          // USD
});

// View all logs: GET /api/ai/logs
// Returns last 50 AI calls with costs
```

---

## 6. DOCKER SETUP — HOW IT ALL RUNS LOCALLY

### docker-compose.yml — 8 Services
```yaml
services:
  postgres:       # PostgreSQL 15, port 5432, volume: postgres_data
  mongodb:        # MongoDB 6,   port 27017, volume: mongo_data
  redis:          # Redis 7,     port 6379,  volume: redis_data
  elasticsearch:  # ES 8.11,     port 9200,  volume: es_data
  qdrant:         # Qdrant,      port 6333,  volume: qdrant_data
  minio:          # MinIO,       port 9000 (API) + 9001 (console)
  backend:        # Node.js,     port 5000, depends_on all above
  frontend:       # Vite,        port 3000, proxies /api to backend
```

### Startup Sequence
```
docker-compose up --build

1. All database containers start
2. Backend waits for PostgreSQL health check to pass
3. Backend Dockerfile runs: npx prisma migrate deploy
   → Creates all PostgreSQL tables from schema.prisma
4. Express server starts on port 5000
5. Vite dev server starts on port 3000
   → All /api requests proxied to localhost:5000

Then run seed:
docker-compose exec backend node src/seed.js
→ Creates 11 users (1 admin + 10 customers)
→ Creates 5 categories + 50 products in PostgreSQL
→ Creates 200 reviews in MongoDB
→ Indexes all 50 products in Elasticsearch
→ Generates embeddings + stores in Qdrant (calls Gemini API)
→ Creates MinIO bucket + sets public read policy
```

### Service URLs in Docker
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Swagger Docs | http://localhost:5000/api-docs |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin123) |
| Elasticsearch | http://localhost:9200 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

### Docker Networking
All services communicate using service names (not localhost):
```
backend connects to: postgres:5432 (not localhost:5432)
backend connects to: mongodb:27017
backend connects to: redis:6379
backend connects to: elasticsearch:9200
backend connects to: minio:9000
```
Docker creates an internal network where service names = hostnames.

### Volumes (Data Persistence)
Data survives container restarts because it's stored in named volumes on host machine:
- `docker-compose down` → containers removed, volumes KEPT (data safe)
- `docker-compose down -v` → containers + volumes removed (data wiped)

---

## 7. VERCEL DEPLOYMENT — HOW THE CLOUD WORKS

### The Problem with Serverless
Vercel is **serverless** — no always-running server. Each API request:
1. Spins up a function (cold start if idle)
2. Handles the request
3. Shuts down

This means:
- Can't run MinIO server → use Cloudinary instead
- MongoDB might not be connected on first request → handle this explicitly

### Backend Vercel Config
```json
// backend/vercel.json
{
  "version": 2,
  "buildCommand": "npx prisma generate",
  "builds": [{ "src": "src/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/index.js" }]
}
```

### The Serverless Pattern in index.js
```javascript
// backend/src/index.js
if (require.main === module) {
  // Running locally: start server normally, listen on port
  start().catch(console.error);
} else {
  // Running on Vercel: export app as function
  // Fire-and-forget DB connections (they'll be ready for next request)
  connectMongo().catch(console.error);
  initElasticsearch().catch(console.error);
  initQdrant().catch(console.error);
}
module.exports = app; // Vercel imports this and calls it per request
```

### Cold Start Problem & Fix
**Problem**: First request after idle → MongoDB not connected → "buffering timed out"

**Fix**: Every MongoDB route handler calls `connectMongo()` first:
```javascript
router.post('/:productId', auth, async (req, res) => {
  await connectMongo(); // instant no-op if already connected (readyState >= 1)
  const review = await Review.create({...}); // safe to use now
});
```

The `connectMongo` function:
```javascript
async function connectMongo() {
  if (mongoose.connection.readyState >= 1) return; // already connected, skip
  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });
}
```

### Conditional Storage (MinIO vs Cloudinary)
```javascript
// storage.js — same code, different env = different behavior
async function uploadFile(buffer, originalname, mimetype, folder) {

  // Docker: MINIO_ENDPOINT is set → use MinIO
  if (minioClient && process.env.MINIO_ENDPOINT) {
    const key = `${folder}/${uuid()}-${originalname}`;
    const bucket = process.env.MINIO_BUCKET;
    await minioClient.putObject(bucket, key, buffer, buffer.length, {...});
    return `http://${process.env.MINIO_ENDPOINT}:9000/${bucket}/${key}`;
  }

  // Vercel: CLOUDINARY_URL is set → use Cloudinary
  if (cloudinary) {
    const resourceType = mimetype === 'application/pdf' ? 'raw' : 'image';
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (err, result) => err ? reject(err) : resolve(result.secure_url)
      );
      stream.end(buffer);
    });
  }
}
```

### Frontend Vercel Config
```json
// frontend/vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Why needed: React Router handles URLs client-side. Without this, refreshing `/products/123` asks Vercel for that file → 404. This rule says: always serve `index.html`, let React Router take over.

### Cloud Database Replacements
| Docker Container | Cloud Service on Vercel |
|-----------------|------------------------|
| postgres container | Neon (serverless PostgreSQL) |
| mongodb container | MongoDB Atlas |
| redis container | Upstash Redis (serverless Redis) |
| elasticsearch container | Elastic Cloud |
| qdrant container | Qdrant Cloud |

All use same connection URL format — just different hostnames in env vars.

---

## 8. CACHING & RATE LIMITING

### Redis Caching Strategy
```javascript
// Pattern: Read-Through Cache
async function getProducts(params) {
  const cacheKey = `products:list:${category}:${page}:${limit}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached); // HIT: no DB call

  // Cache miss: hit database
  const result = await prisma.product.findMany({...});

  // Store in cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  return result;
}

// Cache Invalidation on Update:
async function updateProduct(id, data) {
  await prisma.product.update({ where: { id }, data });

  // Delete specific product cache
  await redis.del(`products:single:${id}`);

  // Delete ALL product list caches (price/rating changed = all pages stale)
  const keys = await redis.keys('products:list:*');
  if (keys.length) await redis.del(...keys);
}
```

### Rate Limiting
```javascript
// middleware/rateLimit.js
const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl',
  points: 60,    // 60 requests allowed
  duration: 60,  // per 60 seconds
});

// Applied globally to ALL routes
app.use(async (req, res, next) => {
  try {
    await limiter.consume(req.ip); // increment counter for this IP
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

Redis stores: `rl:{ip}` = request count, auto-expires after 60 seconds.

---

## 9. PDF INVOICE GENERATION

```javascript
// services/invoice.js — PDFKit generates PDF programmatically
const doc = new PDFDocument({ margin: 40 });
const chunks = [];

doc.on('data', chunk => chunks.push(chunk)); // collect PDF bytes
doc.on('end', async () => {
  const buffer = Buffer.concat(chunks);
  // Upload via storage.js (MinIO or Cloudinary)
  const url = await uploadFile(buffer, `order-${order.id}.pdf`, 'application/pdf', 'invoices');
  // Save URL to PostgreSQL Order record
});

// Draw the PDF content:
doc.fontSize(20).text('SHOPAI');
doc.text(`Order ID: ${order.id}`);
doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
for (const item of order.items) {
  doc.text(`${item.product.name} x${item.quantity}  $${(item.price * item.quantity).toFixed(2)}`);
}
doc.text(`Total: $${order.total.toFixed(2)}`);
doc.end(); // triggers 'end' event above
```

---

## 10. SWAGGER API DOCUMENTATION

**Location**: `http://localhost:5000/api-docs` (Docker)

**How to test as Admin**:
1. Open Swagger UI
2. POST `/api/auth/login` with `{ "email": "admin@test.com", "password": "password123" }`
3. Copy the `token` from response
4. Click "Authorize" button (top right)
5. Enter: `Bearer <paste-token-here>`
6. Now admin-only endpoints (create product, upload image) are accessible

**How Swagger is generated**:
```javascript
// Each route has JSDoc comments above it:
/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products with filters
 *     parameters:
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: minPrice
 *         in: query
 *         schema: { type: number }
 */
router.get('/', async (req, res) => { ... });

// swagger-jsdoc reads these comments and generates OpenAPI JSON
// swagger-ui-express serves the interactive UI
```

---

## 11. KEY FILES MAP

```
backend/
  src/
    index.js              ← Express setup, Vercel serverless export
    config/
      db.js               ← All DB connections (Prisma, Mongoose, Redis, ES, Qdrant, MinIO)
      storage.js          ← MinIO/Cloudinary upload helper (conditional)
      swagger.js          ← Swagger/OpenAPI config
    middleware/
      auth.js             ← JWT verification middleware
      rateLimit.js        ← Redis rate limiting middleware
    models/
      Review.js           ← MongoDB: review schema
      ActivityLog.js      ← MongoDB: user activity schema
      AiLog.js            ← MongoDB: AI cost log schema
    routes/
      auth.js             ← POST /api/auth/register, /login, GET /me
      products.js         ← CRUD + image upload + similar products
      cart.js             ← GET/POST/PUT/DELETE /api/cart
      orders.js           ← checkout, confirm, history, also-bought
      reviews.js          ← reviews CRUD + AI summary + activity logs
      search.js           ← full-text search + autocomplete
      ai.js               ← chatbot + cost logs
    services/
      invoice.js          ← PDFKit invoice generation
    seed.js               ← Populate all 6 databases

  prisma/
    schema.prisma         ← PostgreSQL table definitions
    migrations/           ← Schema change history

frontend/
  src/
    App.jsx               ← All routes defined here
    api/client.js         ← Axios: baseURL + auth header injection
    context/
      AuthContext.jsx     ← Global user state, login/logout functions
    components/
      Layout.jsx          ← Header + nav (wraps all pages)
      SearchBar.jsx       ← Debounced autocomplete search
      ProductCard.jsx     ← Reusable product card component
      Reviews.jsx         ← Review list + write form + AI summary button
      SimilarProducts.jsx ← Qdrant-powered similar products section
      AlsoBought.jsx      ← Co-purchase "Customers Also Bought" section
      ChatWidget.jsx      ← Floating AI chatbot bubble
      Spinner.jsx         ← Loading spinner
    pages/
      Home.jsx            ← Landing page
      Products.jsx        ← Catalog with category + price + rating filters
      ProductDetail.jsx   ← Single product page
      Cart.jsx            ← Shopping cart
      Checkout.jsx        ← Stripe payment form
      Orders.jsx          ← Order history + detail
      Search.jsx          ← Search results with ES filters
      Login.jsx           ← Login form
      Register.jsx        ← Registration form

docker-compose.yml        ← All 8 services defined here
backend/vercel.json       ← Vercel serverless config for backend
frontend/vercel.json      ← SPA rewrite rule for React Router
.env.example              ← Template for all environment variables
README.md                 ← Setup instructions + architecture diagram
```

---

## 12. ENVIRONMENT VARIABLES EXPLAINED

```bash
# PostgreSQL — relational DB for users/products/orders
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# MongoDB — document DB for reviews/activity/AI logs
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Redis — in-memory store for cart/cache/rate-limit
REDIS_URL=rediss://default:pass@host:6380  # 'rediss' = TLS (Upstash)

# Elasticsearch — full-text search engine
ELASTICSEARCH_URL=https://cluster.es.io
ELASTICSEARCH_API_KEY=base64encodedkey==  # for Elastic Cloud auth

# Qdrant — vector database
QDRANT_URL=https://cluster.qdrant.io
QDRANT_API_KEY=eyJhbGciOi...  # JWT format

# MinIO — local object storage (Docker only)
MINIO_ENDPOINT=minio          # Docker service name
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET=ecommerce

# Cloudinary — cloud object storage (Vercel only)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# JWT
JWT_SECRET=any_long_random_string_here

# Stripe
STRIPE_SECRET_KEY=sk_test_...      # backend only, never expose
STRIPE_PUBLISHABLE_KEY=pk_test_... # frontend safe (in VITE_ prefix)

# Google Gemini AI
GEMINI_API_KEY=AIza...

# App
NODE_ENV=development
PORT=5000
```

---

## 13. WHAT TO EXPECT IN THE INTERVIEW

### Questions They Will Ask

**Architecture & Design**
- *"Why did you use 6 databases?"*
  → Each optimized for its specific job. PostgreSQL for ACID transactions and relations, MongoDB for flexible documents, Redis for speed and TTL, Elasticsearch for full-text search with fuzzy matching, Qdrant for vector similarity search.

- *"What is a vector embedding and why Qdrant?"*
  → An embedding is a mathematical representation of text as a high-dimensional array of numbers. Similar texts produce similar vectors. Qdrant stores these vectors and can find the nearest neighbors — products semantically similar even if no keywords match.

- *"How does your cart survive page refresh?"*
  → Cart is stored in Redis with `cart:{userId}` as key, 24-hour TTL. When the page loads, frontend calls `GET /api/cart` which reads from Redis. Nothing is stored in browser memory.

- *"What happens if Redis goes down?"*
  → Cart data would be lost, cached product data gone. Users would need to re-add items. In production you'd use Redis Sentinel or Cluster for high availability. Acceptable trade-off for this project.

- *"How do you prevent someone from paying $0?"*
  → Backend always fetches product prices from PostgreSQL during checkout. The frontend cart price is only for display — it's never trusted for actual payment amount.

- *"What is the cold start problem on serverless?"*
  → When a serverless function is idle for a while, it shuts down. The next request has to re-establish database connections. We solve it by calling `await connectMongo()` at the start of every MongoDB handler — it's an instant no-op if already connected.

**Code & Technical**

- *"What is JWT and how does it work?"*
  → JSON Web Token. Contains user ID and role, signed with a secret key. Server verifies the signature on every request — no session storage needed. Expires after 7 days.

- *"What is bcrypt?"*
  → One-way password hashing algorithm. Adds random salt, runs thousands of hash iterations. Can't reverse the hash. Cost factor 10 means 2^10 iterations. Safe even if DB is breached.

- *"How does the Stripe payment flow work?"*
  → Two-step: (1) backend creates PaymentIntent, gets clientSecret from Stripe. (2) Frontend sends card details DIRECTLY to Stripe (not your server) with that clientSecret. Stripe charges the card. Frontend notifies backend, which verifies with Stripe server-to-server before marking order paid.

- *"What is Prisma?"*
  → ORM (Object-Relational Mapper). Write JavaScript to query PostgreSQL instead of raw SQL. Auto-generates TypeScript types. Handles database migrations when schema changes.

- *"What is rate limiting and how did you implement it?"*
  → Limits requests to 60 per IP per 60 seconds. Uses Redis to count requests per IP. Counter auto-expires. Prevents API abuse and DDoS attacks.

- *"What is the difference between MongoDB and PostgreSQL?"*
  → PostgreSQL: fixed schema, relations, ACID, SQL. Best for structured data with relationships. MongoDB: flexible documents, no fixed schema, horizontal scale. Best for variable-structure data like reviews that may or may not have images/titles.

### Live Coding (15 minutes)
Likely tasks:
- Add a new filter (e.g., sort by price) to the products API
- Add a new field to an existing model
- Explain what a specific piece of code does
- Debug a failing API call

**For any change**: Read the code first → explain what you understand → make the minimal change → test it.

### Demo Walkthrough (prepare this sequence)
1. Show `docker-compose up` starts everything in one command
2. Open Swagger at `http://localhost:5000/api-docs`
3. Login as admin → get token → authorize Swagger → create a product
4. Open frontend: register a new user → browse products
5. Use search: type "hoo" → autocomplete shows → press Enter → filters work
6. Open a product: show Similar Products + Customers Also Bought sections
7. Add to cart → go to cart → checkout with test card `4242 4242 4242 4242`
8. Show order confirmation → download invoice PDF
9. Write a review → click "AI Summary"
10. Use the chatbot: "I need running shoes under $100"
11. Show AI logs at `GET /api/ai/logs` (Swagger or browser)

### Potential Change Requests During Demo
- *"Add sorting to products API"* → add `orderBy` query param to Prisma `findMany`
- *"Make the chatbot respond formally"* → change system prompt in `ai.js`
- *"Add a discount field"* → add to `schema.prisma`, run `prisma migrate dev`, update route
- *"Show me the caching code"* → `backend/src/routes/products.js` top of GET handler
- *"Explain the similar products algorithm"* → embedding → Qdrant cosine search

### Known Limitations (be upfront about these)
- Rate limiting is per IP, not per user (acceptable for this scale)
- No Stripe webhook handler (production risk — network failure between confirm steps could leave order pending)
- Invoice URL hardcoded to localhost in Docker (Cloudinary used on Vercel instead)
- No real-time stock locking — race condition possible if two users buy last item simultaneously (would need DB transaction with SELECT FOR UPDATE)
- Seed must be run manually after `docker-compose up`

---

## 14. FULL REQUIREMENTS CHECKLIST

| # | Requirement | Status | Where |
|---|-------------|--------|-------|
| 1 | JWT auth (signup/login) | ✅ | routes/auth.js |
| 2 | Product catalog (categories, variants, pricing) | ✅ | routes/products.js |
| 3 | Cart (add/remove/update) | ✅ | routes/cart.js |
| 4 | Checkout flow + order placement | ✅ | routes/orders.js |
| 5 | Stripe payment integration | ✅ | routes/orders.js + Checkout.jsx |
| 6 | Order history + status tracking | ✅ | routes/orders.js + Orders.jsx |
| 7 | Reviews (ratings, images, timestamps) | ✅ | routes/reviews.js + MongoDB |
| 8 | Browsing history + click tracking | ✅ | ActivityLog model + routes/reviews.js |
| 9 | AI review summaries | ✅ | routes/reviews.js + Gemini |
| 10 | Redis cart (24h TTL) | ✅ | routes/cart.js + Redis |
| 11 | API rate limiting | ✅ | middleware/rateLimit.js |
| 12 | Product caching + invalidation | ✅ | routes/products.js + Redis |
| 13 | Full-text search + typo tolerance | ✅ | routes/search.js + Elasticsearch |
| 14 | Faceted filters (price, category, rating) | ✅ | Search.jsx + Products.jsx |
| 15 | Autocomplete | ✅ | SearchBar.jsx + /api/search/autocomplete |
| 16 | Similar products (vector search) | ✅ | Qdrant + Gemini embeddings |
| 17 | AI shopping chatbot | ✅ | ChatWidget.jsx + routes/ai.js |
| 18 | Customers also bought | ✅ | AlsoBought.jsx + routes/orders.js |
| 19 | Product + review image upload | ✅ | MinIO (Docker) / Cloudinary (Vercel) |
| 20 | PDF invoice generation | ✅ | services/invoice.js + PDFKit |
| 21 | Docker Compose single command | ✅ | docker-compose.yml |
| 22 | Swagger/OpenAPI docs | ✅ | /api-docs |
| 23 | Seed data (50 products, 200 reviews, 10 users) | ✅ | src/seed.js |
| 24 | AI cost logging | ✅ | AiLog model + /api/ai/logs |
| 25 | .env.example present | ✅ | .env.example |
| 26 | README + architecture + screenshots | ✅ | README.md |

**All 26 requirements satisfied.**

---

*Good luck with the interview! You built this — you understand it.*

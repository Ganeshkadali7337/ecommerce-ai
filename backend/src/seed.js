require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Client: ESClient } = require('@elastic/elasticsearch');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();

const categories = [
  { name: 'T-Shirts', slug: 't-shirts' },
  { name: 'Hoodies', slug: 'hoodies' },
  { name: 'Jeans', slug: 'jeans' },
  { name: 'Sneakers', slug: 'sneakers' },
  { name: 'Accessories', slug: 'accessories' },
];

const productsByCategory = {
  't-shirts': [
    { name: 'Classic White Tee', description: 'Simple everyday cotton t-shirt. Comfortable and breathable.', price: 24.99, stock: 120 },
    { name: 'Graphic Print Tee', description: 'Bold graphic print on 100% cotton. Available in multiple prints.', price: 34.99, stock: 80 },
    { name: 'Striped Polo', description: 'Clean striped polo shirt. Great for casual and semi-formal occasions.', price: 44.99, stock: 60 },
    { name: 'V-Neck Basic Tee', description: 'Slim fit v-neck made from soft combed cotton.', price: 29.99, stock: 90 },
    { name: 'Oversized Drop Tee', description: 'Relaxed oversized fit with dropped shoulders. Streetwear staple.', price: 39.99, stock: 70 },
    { name: 'Longline Curved Hem', description: 'Extended length with curved hem. Pairs well with slim pants.', price: 32.99, stock: 55 },
    { name: 'Pocket Chest Tee', description: 'Minimal chest pocket detail. Clean everyday look.', price: 27.99, stock: 100 },
    { name: 'Henley Collar Tee', description: 'Three-button henley collar. Slightly more refined than a basic tee.', price: 36.99, stock: 65 },
    { name: 'Tie Dye Summer Tee', description: 'Handcrafted tie dye pattern. Each piece is unique.', price: 42.99, stock: 40 },
    { name: 'Muscle Fit Tee', description: 'Contoured cut that follows your shape. Great for the gym or casual wear.', price: 31.99, stock: 85 },
  ],
  'hoodies': [
    { name: 'Classic Pullover Hoodie', description: 'Heavy 400gsm fleece pullover. Kangaroo pocket. Perfect for cold days.', price: 64.99, stock: 50 },
    { name: 'Zip-Up Fleece Hoodie', description: 'Full zip closure with two side pockets. Lightweight and warm.', price: 74.99, stock: 45 },
    { name: 'Oversized Boxy Hoodie', description: 'Relaxed oversized silhouette. Dropped shoulders for streetwear look.', price: 79.99, stock: 35 },
    { name: 'Cropped Hoodie', description: 'Cropped length ending at the waist. Popular with high-waist pants.', price: 59.99, stock: 40 },
    { name: 'Tech Fleece Hoodie', description: 'Engineered tech fleece that is warmer and lighter than regular fleece.', price: 99.99, stock: 30 },
    { name: 'Sherpa Lined Hoodie', description: 'Sherpa fleece lining inside for extra warmth. Great for winter.', price: 89.99, stock: 25 },
    { name: 'Quarter Zip Sweatshirt', description: 'Quarter zip collar for easy on and off. Clean minimal look.', price: 69.99, stock: 55 },
    { name: 'Acid Wash Hoodie', description: 'Vintage acid wash effect. Relaxed fit with ribbed cuffs.', price: 72.99, stock: 30 },
    { name: 'Slim Fit Hoodie', description: 'Tailored slim cut that avoids the bulk. Modern and clean.', price: 67.99, stock: 60 },
    { name: 'Coach Jacket Hoodie', description: 'Lightweight shell with hood. Water resistant. Great for spring.', price: 84.99, stock: 40 },
  ],
  'jeans': [
    { name: 'Slim Fit Black Jeans', description: 'Classic slim cut in jet black denim. Versatile for any occasion.', price: 79.99, stock: 60 },
    { name: 'Straight Leg Blue Jeans', description: 'Traditional straight leg cut in medium blue wash.', price: 74.99, stock: 70 },
    { name: 'Skinny Stretch Jeans', description: 'High-stretch fabric for comfort and mobility with a slim look.', price: 69.99, stock: 50 },
    { name: 'Relaxed Baggy Jeans', description: 'Loose relaxed fit throughout. Trending streetwear silhouette.', price: 84.99, stock: 40 },
    { name: 'Distressed Ripped Jeans', description: 'Pre-distressed with intentional rips and fading. Bold look.', price: 89.99, stock: 35 },
    { name: 'Light Wash Tapered Jeans', description: 'Light blue wash with tapered ankle. Clean and modern.', price: 77.99, stock: 55 },
    { name: 'Dark Indigo Selvedge', description: 'Premium Japanese selvedge denim. Dense weave that fades beautifully.', price: 129.99, stock: 20 },
    { name: 'Cargo Denim Pants', description: 'Denim with cargo pockets on the thighs. Utility meets style.', price: 92.99, stock: 30 },
    { name: 'White Slim Jeans', description: 'Clean white denim in slim cut. Sharp for summer.', price: 82.99, stock: 25 },
    { name: 'Grey Marl Jeans', description: 'Heathered grey denim that sits between formal and casual.', price: 76.99, stock: 45 },
  ],
  'sneakers': [
    { name: 'Classic Low Top White', description: 'Clean white leather low top. Goes with everything. Timeless silhouette.', price: 89.99, stock: 80 },
    { name: 'Chunky Dad Sneaker', description: 'Thick layered sole with retro dad shoe aesthetic. Extremely comfortable.', price: 119.99, stock: 50 },
    { name: 'Minimal Runner', description: 'Sleek runner profile with mesh upper. Lightweight everyday shoe.', price: 99.99, stock: 60 },
    { name: 'High Top Canvas', description: 'Vulcanized canvas high top. Skate heritage with modern comfort.', price: 79.99, stock: 70 },
    { name: 'Suede Low Profile', description: 'Soft suede upper in minimal low profile cut. Understated luxury.', price: 109.99, stock: 40 },
    { name: 'Foam Runner Slide', description: 'Fully injected foam construction. Extremely lightweight and cushioned.', price: 74.99, stock: 90 },
    { name: 'Retro Basketball High', description: 'Basketball-inspired high top with padded collar. Bold silhouette.', price: 139.99, stock: 35 },
    { name: 'Trail Running Shoe', description: 'Aggressive grip sole for off-road running. Water resistant upper.', price: 124.99, stock: 30 },
    { name: 'Court Low Leather', description: 'Tennis court-inspired low leather shoe. Clean and versatile.', price: 94.99, stock: 55 },
    { name: 'Knit Sock Sneaker', description: 'Stretchy knit upper that wraps the foot. Socklike fit, no laces.', price: 104.99, stock: 45 },
  ],
  'accessories': [
    { name: 'Leather Bifold Wallet', description: 'Full grain leather wallet. Slim profile with card slots and cash sleeve.', price: 49.99, stock: 100 },
    { name: 'Canvas Tote Bag', description: 'Heavy duty canvas tote. Large interior with inner zip pocket.', price: 34.99, stock: 80 },
    { name: 'Wool Beanie', description: 'Ribbed knit wool beanie. Folds up for a slouchy look or wear snug.', price: 24.99, stock: 120 },
    { name: 'Stainless Steel Watch', description: 'Minimalist dial on stainless bracelet. 5ATM water resistant.', price: 199.99, stock: 25 },
    { name: 'Leather Belt', description: '35mm full grain leather belt with matte silver buckle.', price: 44.99, stock: 90 },
    { name: 'Snapback Cap', description: 'Structured 6-panel cap with flat brim. Adjustable snapback closure.', price: 32.99, stock: 70 },
    { name: 'Crossbody Bag', description: 'Compact crossbody with adjustable strap. Fits phone, cards, and keys.', price: 59.99, stock: 50 },
    { name: 'Sunglasses', description: 'UV400 polarized lenses with thin metal frame. Classic aviator shape.', price: 79.99, stock: 60 },
    { name: 'Silver Chain Necklace', description: '925 sterling silver box chain. 20 inch length. Comes with clasp.', price: 89.99, stock: 40 },
    { name: 'Phone Crossbody Strap', description: 'Universal phone case with detachable crossbody lanyard strap.', price: 27.99, stock: 85 },
  ],
};

const reviewTexts = [
  'Really happy with this purchase. Exactly as described and the quality is great.',
  'Good product overall. Shipping was fast and packaging was solid.',
  'Fits perfectly. Bought this as a gift and they loved it.',
  'Decent quality for the price. Would buy again.',
  'Not bad but slightly different from the photos. Still keeping it.',
  'Excellent. This is my second purchase and it is just as good as the first.',
  'Very comfortable and the material feels premium. Highly recommend.',
  'Looks exactly like the photos. Very pleased with this.',
  'Great value. Much better than I expected at this price point.',
  'Runs a bit small so size up. Otherwise perfect.',
  'The quality is solid and it arrived on time. Happy with the purchase.',
  'Love it. Already got compliments wearing it out.',
  'Good but the color is slightly darker than shown online.',
  'Five stars. No complaints at all. Will buy more.',
  'Comfortable and well made. The stitching looks durable.',
  'Ordered this for a trip and it was perfect. Would recommend.',
  'Exactly what I needed. Simple and high quality.',
  'Fast delivery and the product is great. Thank you.',
  'Average quality. It is fine but nothing exceptional.',
  'Really nice. Better than other brands I have tried at this price.',
];

const userNames = [
  { name: 'Alex Carter', email: 'alex@test.com' },
  { name: 'Jordan Smith', email: 'jordan@test.com' },
  { name: 'Morgan Lee', email: 'morgan@test.com' },
  { name: 'Casey Brown', email: 'casey@test.com' },
  { name: 'Riley Davis', email: 'riley@test.com' },
  { name: 'Taylor Wilson', email: 'taylor@test.com' },
  { name: 'Jamie Moore', email: 'jamie@test.com' },
  { name: 'Drew Anderson', email: 'drew@test.com' },
  { name: 'Sam Thomas', email: 'sam@test.com' },
  { name: 'Chris Jackson', email: 'chris@test.com' },
];

const ReviewSchema = new mongoose.Schema({
  productId: String,
  userId: String,
  userName: String,
  rating: Number,
  title: String,
  body: String,
  createdAt: { type: Date, default: Date.now },
});

async function seed() {
  console.log('Seeding database...');

  await mongoose.connect(process.env.MONGO_URL);
  const Review = mongoose.model('Review', ReviewSchema);

  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await Review.deleteMany();

  console.log('Cleared existing data');

  const password = await bcrypt.hash('password123', 10);
  const users = await Promise.all(
    userNames.map(u =>
      prisma.user.create({ data: { name: u.name, email: u.email, password } })
    )
  );
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@test.com', password, role: 'admin' },
  });
  console.log(`Created ${users.length + 1} users`);

  const createdCategories = await Promise.all(
    categories.map(c => prisma.category.create({ data: c }))
  );
  console.log(`Created ${createdCategories.length} categories`);

  const allProducts = [];
  for (const cat of createdCategories) {
    const items = productsByCategory[cat.slug] || [];
    for (const item of items) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const product = await prisma.product.create({
        data: { ...item, slug, categoryId: cat.id },
      });
      allProducts.push(product);
    }
  }
  console.log(`Created ${allProducts.length} products`);

  const es = new ESClient({
    node: process.env.ELASTICSEARCH_URL,
    ...(process.env.ELASTICSEARCH_API_KEY && { auth: { apiKey: process.env.ELASTICSEARCH_API_KEY } }),
  });
  for (const product of allProducts) {
    const cat = createdCategories.find(c => c.id === product.categoryId);
    await es.index({
      index: 'products',
      id: product.id,
      document: { name: product.name, description: product.description, category: cat?.name || '', price: product.price, rating: 4 },
    }).catch(() => {});
  }
  console.log('Indexed products in Elasticsearch');

  try {
    const qdrant = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embModel = genai.getGenerativeModel({ model: 'gemini-embedding-001' });

    try { await qdrant.deleteCollection('products'); } catch {}
    await qdrant.createCollection('products', { vectors: { size: 3072, distance: 'Cosine' } });

    for (const product of allProducts) {
      const cat = createdCategories.find(c => c.id === product.categoryId);
      const text = `${product.name} ${product.description} ${cat?.name || ''}`;
      const embResult = await embModel.embedContent(text);
      const vector = embResult.embedding.values;
      await qdrant.upsert('products', {
        points: [{ id: product.id, vector, payload: { product_id: product.id } }],
      });
    }
    console.log('Indexed products in Qdrant (vector search)');
  } catch (err) {
    console.log('Qdrant indexing skipped:', err.message);
  }

  // Assign a target avg rating per product — spread across 1–5 so filters are meaningful
  const productRatingTarget = allProducts.map((_, idx) => {
    // Distribute: ~20% get 5, ~30% get 4, ~25% get 3, ~15% get 2, ~10% get 1
    const buckets = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
                     4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
                     3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
                     2, 2, 2, 2, 2, 2, 2,
                     1, 1, 1, 1, 1, 1];
    return buckets[idx % buckets.length];
  });

  const reviews = [];
  for (let i = 0; i < 200; i++) {
    const product = allProducts[i % allProducts.length];
    const user = users[i % users.length];
    const target = productRatingTarget[i % allProducts.length];
    // Allow ±1 variation around the target, clamped to 1–5
    const variation = Math.floor(Math.random() * 3) - 1;
    const rating = Math.min(5, Math.max(1, target + variation));
    reviews.push({
      productId: product.id,
      userId: user.id,
      userName: user.name,
      rating,
      title: `Review ${i + 1}`,
      body: reviewTexts[i % reviewTexts.length],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }
  await Review.insertMany(reviews);
  console.log(`Created 200 reviews`);

  // Calculate avg rating per product and sync to PostgreSQL + Elasticsearch
  for (const product of allProducts) {
    const productReviews = reviews.filter(r => r.productId === product.id);
    const avgRating = productReviews.length
      ? parseFloat((productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length).toFixed(2))
      : 0;
    await prisma.product.update({ where: { id: product.id }, data: { rating: avgRating } });
    const cat = createdCategories.find(c => c.id === product.categoryId);
    await es.update({
      index: 'products',
      id: product.id,
      doc: { rating: avgRating },
    }).catch(() => {});
  }
  console.log('Synced avg ratings to products');

  console.log('\nAll done. Test credentials:');
  console.log('  Customer: alex@test.com / password123');
  console.log('  Admin:    admin@test.com / password123');

  await mongoose.disconnect();
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

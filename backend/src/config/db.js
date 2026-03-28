const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const { createClient } = require('ioredis');
const { Client: ESClient } = require('@elastic/elasticsearch');
const { QdrantClient } = require('@qdrant/js-client-rest');
const Minio = require('minio');

const prisma = new PrismaClient();

async function connectMongo() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('MongoDB connected');
}

const redis = new (require('ioredis'))(process.env.REDIS_URL);
redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

const esClient = new ESClient({ node: process.env.ELASTICSEARCH_URL });

const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL });

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

async function initMinio() {
  const bucket = process.env.MINIO_BUCKET;
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket);
    await minioClient.setBucketPolicy(bucket, JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      }],
    }));
    console.log(`MinIO bucket '${bucket}' created`);
  } else {
    console.log('MinIO connected');
  }
}

async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: 'products' });
    if (!exists) {
      await esClient.indices.create({
        index: 'products',
        body: {
          mappings: {
            properties: {
              name: { type: 'text', analyzer: 'standard' },
              description: { type: 'text' },
              category: { type: 'keyword' },
              price: { type: 'float' },
              rating: { type: 'float' },
            },
          },
        },
      });
      console.log('Elasticsearch index created');
    } else {
      console.log('Elasticsearch connected');
    }
  } catch (err) {
    console.error('Elasticsearch init error:', err.message);
  }
}

async function initQdrant() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === 'products');
    if (!exists) {
      await qdrantClient.createCollection('products', {
        vectors: { size: 1536, distance: 'Cosine' },
      });
      console.log('Qdrant collection created');
    } else {
      console.log('Qdrant connected');
    }
  } catch (err) {
    console.error('Qdrant init error:', err.message);
  }
}

module.exports = {
  prisma,
  connectMongo,
  redis,
  esClient,
  qdrantClient,
  minioClient,
  initMinio,
  initElasticsearch,
  initQdrant,
};

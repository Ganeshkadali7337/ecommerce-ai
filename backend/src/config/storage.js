const { minioClient } = require('./db');

// Cloudinary only configured when CLOUDINARY_URL is set (Vercel)
let cloudinary = null;
if (process.env.CLOUDINARY_URL) {
  cloudinary = require('cloudinary').v2;
  // cloudinary auto-configures from CLOUDINARY_URL env var
}

/**
 * Upload a file buffer to MinIO (Docker) or Cloudinary (Vercel).
 * @param {Buffer} buffer - file data
 * @param {string} originalname - original filename
 * @param {string} mimetype - e.g. image/jpeg
 * @param {string} folder - 'products' or 'reviews'
 * @returns {Promise<string>} public URL
 */
async function uploadFile(buffer, originalname, mimetype, folder = 'products') {
  // Docker: MinIO
  if (minioClient && process.env.MINIO_ENDPOINT) {
    const { v4: uuid } = require('uuid');
    const key = `${folder}/${uuid()}-${originalname}`;
    const bucket = process.env.MINIO_BUCKET || 'ecommerce';
    await minioClient.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': mimetype });
    return `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || 9000}/${bucket}/${key}`;
  }

  // Vercel: Cloudinary
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

  throw new Error('No storage configured');
}

module.exports = { uploadFile };

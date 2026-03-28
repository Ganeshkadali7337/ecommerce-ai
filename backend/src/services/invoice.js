const PDFDocument = require('pdfkit');
const { minioClient } = require('../config/db');

async function generateInvoice(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const key = `invoices/order-${order.id}.pdf`;
        const bucket = process.env.MINIO_BUCKET;

        await minioClient.putObject(bucket, key, buffer, buffer.length, {
          'Content-Type': 'application/pdf',
        });

        resolve(`http://localhost:9000/${bucket}/${key}`);
      } catch (err) {
        reject(err);
      }
    });

    doc.fontSize(20).text('SHOPAI', { align: 'left' });
    doc.fontSize(10).text('Invoice', { align: 'left' });
    doc.moveDown();
    doc.text(`Order ID: ${order.id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${order.user?.name || ''}`);
    doc.moveDown();

    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.5);

    for (const item of order.items) {
      doc.fontSize(10).text(
        `${item.product?.name || item.productId}  x${item.quantity}  $${(item.price * item.quantity).toFixed(2)}`,
        { align: 'left' }
      );
    }

    doc.moveDown();
    doc.fontSize(12).text(`Total: $${order.total.toFixed(2)}`, { align: 'right' });

    doc.end();
  });
}

module.exports = { generateInvoice };

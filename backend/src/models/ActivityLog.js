const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  type: { type: String, enum: ['view', 'search', 'add_to_cart', 'purchase'] },
  productId: String,
  query: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

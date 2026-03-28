const mongoose = require('mongoose');

const AiLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['chat', 'summary', 'embedding'] },
  prompt: String,
  response: String,
  model: String,
  tokensUsed: Number,
  cost: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AiLog', AiLogSchema);

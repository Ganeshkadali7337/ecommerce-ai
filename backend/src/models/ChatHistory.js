const mongoose = require('mongoose');

const ChatHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  messages: [
    {
      role: { type: String, enum: ['human', 'ai'], required: true },
      content: { type: String, required: true },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);

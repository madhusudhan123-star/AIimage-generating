const mongoose = require('mongoose');

const generationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, required: true },
  enhancedPrompt: String,
  imageUrl: String,
  seed: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Generation', generationSchema);

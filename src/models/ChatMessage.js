import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  note: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

ChatMessageSchema.index({ user: 1, note: 1, createdAt: 1 });

export default mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);



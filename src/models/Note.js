import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    enum: ['text', 'md'],
    default: 'text',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Note || mongoose.model('Note', NoteSchema);

import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  gridFsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
  },
});

export default mongoose.models.Image || mongoose.model('Image', ImageSchema);



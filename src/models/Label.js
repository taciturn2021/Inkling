import mongoose from 'mongoose';

const LabelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a label name.'],
  },
  color: {
    type: String,
    required: [true, 'Please provide a color.'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export default mongoose.models.Label || mongoose.model('Label', LabelSchema);

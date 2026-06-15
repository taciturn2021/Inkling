import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username.'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
  },
  role: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
  },
  groqApiKey: {
    type: String,
    default: '',
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);

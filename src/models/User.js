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
  geminiApiKey: {
    type: String,
    default: '',
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);

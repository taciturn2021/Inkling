import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ip', 'account'],
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  failCount: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

LoginAttemptSchema.index({ type: 1, key: 1 }, { unique: true });

export default mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', LoginAttemptSchema);

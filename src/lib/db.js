import mongoose from 'mongoose';

const RAW_URI = (process.env.MONGODB_URI || '').trim();
const DB_NAME = (process.env.MONGODB_DB || '').trim();

if (!RAW_URI) {
  throw new Error(
    'Missing MONGODB_URI. Define it in .env.local (starts with mongodb:// or mongodb+srv://)'
  );
}

// Basic validation to give a clearer error before reaching the driver
if (!(RAW_URI.startsWith('mongodb://') || RAW_URI.startsWith('mongodb+srv://'))) {
  throw new Error(
    'Invalid MONGODB_URI. It must start with "mongodb://" or "mongodb+srv://"'
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Supply dbName via options if not embedded in the URI
      ...(DB_NAME ? { dbName: DB_NAME } : {}),
    };

    cached.promise = mongoose.connect(RAW_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

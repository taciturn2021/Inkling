import mongoose from 'mongoose';

export function getGridFsBucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
}



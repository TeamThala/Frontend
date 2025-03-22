// models/RMDTable.js
import mongoose from 'mongoose';

const RMDTableSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  table: [{
    age: { type: Number, required: true },
    distributionPeriod: { type: Number, required: true }
  }],
  updatedAt: { type: Date, default: Date.now }
});

RMDTableSchema.index({ year: 1 }, { unique: true });

export default mongoose.models.RMDTable || 
  mongoose.model('RMDTable', RMDTableSchema);
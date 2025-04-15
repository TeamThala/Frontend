import { Schema, model, models } from 'mongoose';

const rothConversionStrategySchema = new Schema({
  name: { type: String, default: "Default Strategy" },
  investmentOrder: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
  owner: { type: Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now }
});

const RothConversionStrategy = models.RothConversionStrategy || 
  model('RothConversionStrategy', rothConversionStrategySchema);

export default RothConversionStrategy;
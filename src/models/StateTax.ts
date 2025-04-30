import { Schema, model, models } from "mongoose";

const stateTaxSchema = new Schema({
  code: { type: String, required: true }, // State code (e.g., "NY", "CA")
  name: { type: String, required: true }, // State name (e.g., "New York", "California")
  yaml: { type: String, required: true }, // YAML configuration for state tax brackets
  lastUpdated: { type: Date, default: Date.now },
  isDefault: { type: Boolean, default: false }, // Whether this is a system-provided default
  createdBy: { type: Schema.Types.ObjectId, ref: "User" }, // User who created this config (null for system defaults)
});

// Add index for faster lookups by state code
stateTaxSchema.index({ code: 1 });

const StateTax = models.StateTax || model("StateTax", stateTaxSchema);
export default StateTax; 
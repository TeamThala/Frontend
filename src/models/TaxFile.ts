// models/TaxFile.ts
import { Schema, model, models } from "mongoose";

const taxFileSchema = new Schema({
  user:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  state:  { type: String, required: true },
  content:{ type: String, required: true },  // your YAML text
  createdAt: { type: Date, default: Date.now }
});

export default models.TaxFile || model("TaxFile", taxFileSchema);

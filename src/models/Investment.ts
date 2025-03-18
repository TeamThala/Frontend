// src/models/Investment.ts
import { Schema, model, models } from "mongoose";

const investmentSchema = new Schema(
  {
    value: { type: Number, required: true },
    investmentType: {
      type: Schema.Types.ObjectId,
      ref: "InvestmentType",
      required: true,
    },
    taxStatus: {
      type: String,
      enum: ["non-retirement", "pre-tax", "after-tax"],
      required: true,
    },
  },
  { timestamps: true }
);

const Investment = models.Investment || model("Investment", investmentSchema);
export default Investment;

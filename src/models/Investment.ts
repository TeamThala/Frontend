import { Schema, model, models } from "mongoose";
import "@/models/Event";
import "@/models/User";
import "@/models/Scenario";
const investmentSchema = new Schema(
  {
    value: { type: Number, required: true, default: 0 },
    investmentType: {
      type: Schema.Types.ObjectId,
      ref: "InvestmentType"
    },
    taxStatus: {
      type: String,
      enum: ["non-retirement", "pre-tax", "after-tax"],
    },
    purchasePrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Investment = models.Investment || model("Investment", investmentSchema);
export default Investment;

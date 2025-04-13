import { Schema, model, models } from "mongoose";
import "@/models/Event";
import "@/models/User";
import "@/models/Scenario";
const investmentSchema = new Schema(
  {
    value: { type: Number, required: true, default: 0 },
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
    purchasePrice: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Investment = models.Investment || model("Investment", investmentSchema);
export default Investment;

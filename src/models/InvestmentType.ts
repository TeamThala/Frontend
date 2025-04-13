import { Schema, model, models } from "mongoose";
import "@/models/Event";
import "@/models/User";
import "@/models/Scenario";
import "@/models/Investment";

const investmentTypeSchema = new Schema(
  {
    name: { type: String, required: true, default: "Cash" },
    description: { type: String, default: "Cash account" },
    expectedAnnualReturn: {
      type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
        required: true,
      },
      valueType: { type: String, enum: ["amount", "percentage"], required: true },
      value: { type: Number },
      mean: { type: Number },
      stdDev: { type: Number },
      min: { type: Number },
      max: { type: Number },
    },
    expenseRatio: { type: Number, required: true },
    expectedAnnualIncome: {
      type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
        required: true,
      },
      valueType: { type: String, enum: ["amount", "percentage"], required: true },
      value: { type: Number },
      mean: { type: Number },
      stdDev: { type: Number },
      min: { type: Number },
      max: { type: Number },
    },
    taxability: { type: Boolean, required: true },
  },
  { timestamps: true }
);

const InvestmentType =
  models.InvestmentType || model("InvestmentType", investmentTypeSchema);
export default InvestmentType;

// src/models/InvestmentType.ts
import { Schema, model, models } from "mongoose";

const investmentTypeSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    // We store either "fixed" or "normal" in the same field
    expectedAnnualReturn: {
      type: {
        type: String,
        enum: ["fixed", "normal", "uniform"], // Add more if needed
        required: true,
      },
      valueType: { type: String, enum: ["amount", "percentage"] },
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
      valueType: { type: String, enum: ["amount", "percentage"] },
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

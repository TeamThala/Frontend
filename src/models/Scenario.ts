import { Schema, model, models } from "mongoose";
import mongoose from "mongoose";
import "@/models/Investment";
import "@/models/Event";
import "@/models/User";
import "@/models/InvestmentType";
/**
 * Sub-schemas for distribution-like fields:
 * (FixedValues, NormalDistributionValues, UniformDistributionValues)
 */
const scenarioSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  financialGoal: { type: Number, default: 0 },
  investments: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
  eventSeries: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  spendingStrategy: [{ type: Schema.Types.ObjectId, ref: "Event" }], // only discretionary events
  expenseWithdrawalStrategy: [{ type: Schema.Types.ObjectId, ref: "Investment" }], // only investment events
  inflationRate: { 
    type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
      },
      valueType: { type: String, enum: ["percentage"] },
      value: { type: Number},
      mean: { type: Number},
      stdDev: { type: Number},
      min: { type: Number},
      max: { type: Number},
    },
  RothConversionStrategy: [{ type: Schema.Types.ObjectId, ref: "RothConversionStrategy" }],
  //RMDStrategy: [{ type: Schema.Types.ObjectId, ref: "RMDStrategy" }],
  //rothConversion: { type: Object, default: null },
  residenceState: { type: String, default: "NY" },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: false },
  ownerBirthYear: { type: Number, default: 2000 },
  ownerLifeExpectancy: { 
    type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
    },
    valueType: { type: String, enum: ["amount"] },
    value: { type: Number},
    mean: { type: Number},
    stdDev: { type: Number},
    min: { type: Number},
    max: { type: Number},
    },
  viewPermissions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  editPermissions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  updatedAt: { type: Date, default: Date.now },
  type: { type: String, default: "individual", enum: ["individual", "couple"]},
  spouseBirthYear: { type: Number },
  spouseLifeExpectancy: { 
    type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
      },
      valueType: { type: String, enum: ["amount"] },
      value: { type: Number},
      mean: { type: Number},
      stdDev: { type: Number},
      min: { type: Number},
      max: { type: Number},
    },
    step: { type: Number, default: 0 },
});

const Scenario = models.Scenario || model("Scenario", scenarioSchema);
export default Scenario;
import { Schema, model, models } from "mongoose";

const scenarioSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  financialGoal: { type: Number, default: 0, required: true },
  investments: [{ type: Schema.Types.ObjectId, ref: "Investment",required: true }],
  eventSeries: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  spendingStrategy: [{ type: Schema.Types.ObjectId, ref: "Event" }], // only discretionary events
  expenseWithdrawalStrategy: [{ type: Schema.Types.ObjectId, ref: "Investment" }], // only investment events
  inflationRate: { 
    type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
        required: true,
      },
      valueType: { type: String, enum: ["percentage"], required: true },
      value: { type: Number, default: 0.03 },
      mean: { type: Number, default: 0.03 },
      stdDev: { type: Number, default: 0.01 },
      min: { type: Number, default: 0.01 },
      max: { type: Number, default: 0.05 },
    },
  RothConversionStrategy: [{ type: Schema.Types.ObjectId, ref: "RothConversionStrategy" }],
  //RMDStrategy: [{ type: Schema.Types.ObjectId, ref: "RMDStrategy" }],
  //rothConversion: { type: Object, default: null },
  residenceState: { type: String, default: "NY", required: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: "Guest", required: true },
  ownerBirthYear: { type: Number, default: 2000, required: true },
  ownerLifeExpectancy: { 
    type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
        required: true,
      },
    valueType: { type: String, enum: ["amount"], required: true },
    value: { type: Number, default: 85 },
    mean: { type: Number, default: 85 },
    stdDev: { type: Number, default: 5 },
    min: { type: Number, default: 80 },
    max: { type: Number, default: 90 },
    },
  viewPermissions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  editPermissions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  updatedAt: { type: Date, default: Date.now },
  type: { type: String, default: "individual", enum: ["individual", "couple"]},
  spouseBirthYear: { type: Number, default: 2000 },
  spouseLifeExpectancy: { 
    type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
        required: true,
      },
      valueType: { type: String, enum: ["amount"], required: true },
      value: { type: Number, default: 85 },
      mean: { type: Number, default: 85 },
      stdDev: { type: Number, default: 5 },
      min: { type: Number, default: 80 },
      max: { type: Number, default: 90 },
    },
});

const Scenario = models.Scenario || model("Scenario", scenarioSchema);

export default Scenario;


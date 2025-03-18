// src/models/Scenario.ts
import { Schema, model, models } from "mongoose";

/**
 * Sub-schemas for distribution-like fields:
 * (FixedValues, NormalDistributionValues, UniformDistributionValues)
 */
const distributionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["fixed", "normal", "uniform"],
      required: true,
    },
    valueType: { type: String, enum: ["amount", "percentage"] },
    // For "fixed":
    value: { type: Number },
    // For "normal":
    mean: { type: Number },
    stdDev: { type: Number },
    // For "uniform":
    min: { type: Number },
    max: { type: Number },
  },
  { _id: false }
);

// RothConversion subdoc
const rothConversionStrategySchema = new Schema(
  {
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
    investmentOrder: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
    maxTaxBracket: { type: Number }, // optional
  },
  { _id: false }
);

// RMD subdoc
const rmdSchema = new Schema(
  {
    startAge: { type: Number, required: true },
    investmentOrder: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
    percentage: {
      type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
      },
      valueType: { type: String, enum: ["amount", "percentage"] },
      value: { type: Number },
      mean: { type: Number },
      stdDev: { type: Number },
      min: { type: Number },
      max: { type: Number },
    },
  },
  { _id: false }
);

// Subdoc for WithRothConversion or WithoutRothConversion
const withOrWithoutRothSchema = new Schema(
  {
    rothConversion: { type: Boolean, required: true },
    RothConversionStartYear: { type: Number },
    RothConversionEndYear: { type: Number },
  },
  { _id: false }
);

const scenarioSchema = new Schema(
  {
    type: { type: String, enum: ["single", "couple"], required: true },
    name: { type: String, required: true },
    description: { type: String },
    financialGoal: { type: Number, required: true },
    investments: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
    eventSeries: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    spendingStrategy: [{ type: Schema.Types.ObjectId, ref: "Event" }], // only discretionary events
    expenseWithdrawalStrategy: [{ type: Schema.Types.ObjectId, ref: "Event" }], // only investment events
    inflationRate: { type: distributionSchema, required: true },
    RothConversionStrategy: [rothConversionStrategySchema],
    RMDStrategy: [rmdSchema],
    rothConversion: { type: withOrWithoutRothSchema, required: true },
    residenceState: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    viewPermissions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    editPermissions: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // single scenario
    userBirthYear: { type: Number },
    userLifeExpectancy: { type: Number },

    // couple scenario
    spouseBirthYear: { type: Number },
    spouseLifeExpectancy: { type: Number },
  },
  { timestamps: true }
);

const Scenario = models.Scenario || model("Scenario", scenarioSchema);
export default Scenario;

// src/models/Event.ts
import { Schema, model, models } from "mongoose";
import "@/models/User";
import "@/models/Scenario";
import "@/models/Investment";
// Sub-schema for the "year" union (FixedYear, UniformYear, NormalYear, EventYear)
const yearSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["fixed", "uniform", "normal", "event"],
    },
    // For "fixed":
    year: { type: Number },
    // For "uniform":
    startYear: { type: Number },
    endYear: { type: Number },
    // For "normal":
    mean: { type: Number },
    stdDev: { type: Number },
    // For "event":
    eventTime: { type: String, enum: ["start", "end"] },
    event: { type: Schema.Types.ObjectId, ref: "Event" },
  },
  { _id: false }
);

// Sub-schema for the "eventType" union
const eventTypeSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense", "investment", "rebalance"],
    },

    // Fields for IncomeEvent
    amount: { type: Number },
    
    expectedAnnualChange: {
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
    inflationAdjustment: { type: Boolean, default: true },
    percentageOfIncome: { type: Number },
    socialSecurity: { type: Boolean, default: false },
    wage: { type: Boolean, default: true },
    
    // Fields for ExpenseEvent
    discretionary: { type: Boolean },

    // Fields for InvestmentEvent / RebalanceEvent
    assetAllocation: [
      {
        type: {
          type: String,
          enum: ["fixed", "glidePath"],
        },
        investments: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
        percentages: [{ type: Number }],
        initialPercentage: [{ type: Number }],
        finalPercentage: [{ type: Number }],
      },
    ],
    maximumCash: { type: Number },
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    startYear: { type: yearSchema, required: true },
    duration: { 
      type: {
        type: String,
        enum: ["fixed", "normal", "uniform"],
      },
    valueType: { type: String, enum: ["amount"] },
    value: { type: Number },
    mean: { type: Number },
    stdDev: { type: Number },
    min: { type: Number },
    max: { type: Number },
  },
    eventType: { type: eventTypeSchema },
  },
  { timestamps: true }
);

const Event = models.Event || model("Event", eventSchema);
export default Event;

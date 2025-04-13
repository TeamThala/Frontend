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
      required: true,
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
      required: true,
    },

    // Fields for IncomeEvent
    amount: { type: Number, required: true },
    
    expectedAnnualChange: {
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
          required: true,
        },
        investments: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
        percentages: [{ type: Number }],
        initialPercentage: [{ type: Number }],
        finalPercentage: [{ type: Number }],
      },
    ],
    maximumCash: { type: Number, required: true },
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
        required: true,
      },
    valueType: { type: String, enum: ["amount"], required: true },
    value: { type: Number, default: 85 },
    mean: { type: Number, default: 85 },
    stdDev: { type: Number, default: 5 },
    min: { type: Number, default: 80 },
    max: { type: Number, default: 90 },
  },
    eventType: { type: eventTypeSchema, required: true },
  },
  { timestamps: true }
);

const Event = models.Event || model("Event", eventSchema);
export default Event;

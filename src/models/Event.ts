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
    // For "fixed", "uniform", and "normal" types
    year: {
      type: Schema.Types.Mixed, // Can be either Number (for fixed) or distributionValueSchema (for uniform/normal)
    },
    // For "event":
    eventTime: { type: String, enum: ["start", "end"] },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  },
  { _id: false }
);
yearSchema.virtual("event", {
  ref: "Event",
  localField: "eventId",
  foreignField: "_id",
  justOne: true,
});

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
        initialPercentages: [{ type: Number }],
        finalPercentages: [{ type: Number }],
      },
    ],
    portfolioDistribution: [
      {
        type: { type: String, enum: ["fixed", "glidePath"] },
        investments: [{ type: Schema.Types.ObjectId, ref: "Investment" }],
        percentages: [{ type: Number }],
        initialPercentages: [{ type: Number }],
        finalPercentages: [{ type: Number }],
      },
    ],
    maxCash: { type: Number },
  },
  { _id: false }
);

const durationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["fixed", "normal", "uniform"],
      required: true,
    },
    valueType: { type: String, enum: ["amount"], required: true },
    year: {
      type: Schema.Types.Mixed,
      required: true,
    },
    value:{
      type: Number,
      required: false,
    }
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    startYear: { type: yearSchema, required: true },
    duration: { type: durationSchema },
    eventType: { type: eventTypeSchema },
  },
  { timestamps: true }
);
eventSchema.set("toObject", { virtuals: true });
eventSchema.set("toJSON", { virtuals: true });


const Event = models.Event || model("Event", eventSchema);
export default Event;

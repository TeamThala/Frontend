import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    stateTaxFiles: {
      type: Map,
      of: String, // Maps state code to file ID
      default: new Map()
    },

    // References to scenarios the user created or can read/write
    createdScenarios: [{ type: Schema.Types.ObjectId, ref: "Scenario", default: [] }],
    readScenarios: [{ type: Schema.Types.ObjectId, ref: "Scenario", default: [] }],
    readWriteScenarios: [{ type: Schema.Types.ObjectId, ref: "Scenario", default: [] }],
  },
  { timestamps: true }
);

const User = models.User || model("User", userSchema);
export default User;

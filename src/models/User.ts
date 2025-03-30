import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },

    // References to scenarios the user created or can read/write
    createdScenarios: [{ type: Schema.Types.ObjectId, ref: "Scenario" }],
    readScenarios: [{ type: Schema.Types.ObjectId, ref: "Scenario" }],
    readWriteScenarios: [{ type: Schema.Types.ObjectId, ref: "Scenario" }],
  },
  { timestamps: true }
);

const User = models.User || model("User", userSchema);
export default User;

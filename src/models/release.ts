import { model, Schema } from "mongoose";

// mainline: WAFT001
// sublines: WAFT-FDL001 WAFT-COMP001
const ReleaseSchema = new Schema(
  {
    catalog: { type: String, required: true, unique: true },
    series: {
      type: String,
      enum: ["FDL", "COMP", null], // null = mainline
      default: null,
    },    type: {
      type: String,
      enum: ["COMP", "FDL", "EP", "LP"],
      required: true,
    },
    title: { type: String },
    releaseDate: { type: Date },

    channelId: { type: String, required: true },
    planningMessageId: { type: String },
    threadId: { type: String },

    // tracks: { type: [], default: [] },
  },
  { timestamps: true }
);

export const Release = model("Release", ReleaseSchema);

import { model, Schema } from "mongoose";

const ReleaseSchema = new Schema(
  {
    catalog: { type: String, required: true, unique: true },
    series: { type: String, default: null },
    type: {
      type: String,
      enum: ["COMP", "FDL", "EP", "ALBUM"],
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

ReleaseSchema.index({ catalog: 1 }, { unique: true });

export const Release = model("Release", ReleaseSchema);

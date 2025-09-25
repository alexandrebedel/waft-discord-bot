import { LINE_TYPES, RELEASE_TYPES } from "@waft/constants";
import { model, Schema } from "mongoose";

// mainline: WAFT001
// sublines: WAFT-FDL001 WAFT-COMP001
const ReleaseSchema = new Schema(
  {
    catalog: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: RELEASE_TYPES.map((v) => v.value),
      required: true,
    },
    lineType: {
      type: String,
      enum: LINE_TYPES,
      required: true,
    },
    title: { type: String },
    releaseDate: { type: Date },

    // Discord related stuff
    channelId: { type: String, required: true },
    planningMessageId: { type: String },
    // Drive releated stuff
    threadId: { type: String },
    driveFolderId: { type: String, required: true },
    soundcloudPlaylistId: String,
  },
  { timestamps: true }
);

export const Release = model("Release", ReleaseSchema);

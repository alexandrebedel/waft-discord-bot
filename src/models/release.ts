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
    title: { type: String, required: true },
    description: { type: String, required: true },
    releaseDate: Date,
    published: Boolean,

    // Discord related stuff
    channelId: { type: String, required: true },
    planningMessageId: String,
    // Drive releated stuff
    threadId: String,
    driveFolderId: { type: String, required: true },
    // SoundCloud releated stuff
    soundcloudPlaylistId: String,
    soundcloudPlaylistSecret: String,
  },
  { timestamps: true }
);

export const Release = model("Release", ReleaseSchema);

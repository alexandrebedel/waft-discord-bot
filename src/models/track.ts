import { model, Schema, Types } from "mongoose";

const TrackSchema = new Schema(
  {
    releaseId: {
      type: Types.ObjectId,
      ref: "Release",
      required: true,
      index: true,
    },
    index: { type: Number, required: true, min: 1 },
    artist: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    releaseDate: { type: Date },

    driveFileId: { type: String, index: true },
    driveWebViewLink: String,
    filename: String,
    mimetype: String,
    size: Number,
    status: {
      type: String,
      enum: ["premaster", "master"],
      default: "premaster",
    },
    // Discord user id
    createdByUserId: { type: String },
  },
  { timestamps: true }
);

TrackSchema.index({ releaseId: 1, index: 1 }, { unique: true });

export const Track = model("Track", TrackSchema);

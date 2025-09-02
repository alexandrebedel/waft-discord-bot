import { model, Schema } from "mongoose";

const TrackSchema = new Schema({}, { timestamps: true });

export const Track = model("Track", TrackSchema);

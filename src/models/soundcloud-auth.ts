import { model, Schema } from "mongoose";

const SoundCloudAuthSchema = new Schema(
  {
    _id: { type: String, default: "soundcloud", immutable: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: null },
    tokenType: { type: String, default: "OAuth" },
    scope: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    account: {
      id: { type: Number },
      username: { type: String },
      permalink: { type: String },
      avatar_url: { type: String },
    },
  },
  { timestamps: true, _id: false }
);

export const SoundCloudAuth = model("SoundCloudAuth", SoundCloudAuthSchema);

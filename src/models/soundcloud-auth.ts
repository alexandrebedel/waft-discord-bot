import { model, Schema } from "mongoose";

const SoundcloudSchema = new Schema(
  {
    key: { type: String, default: "soundcloud", unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    tokenType: { type: String, default: "Bearer" },
    expiresAt: { type: Date, required: true },
    scope: { type: String, default: "" },
  },
  { timestamps: true }
);

export const SoundcloudAuth = model("SoundcloudAuth", SoundcloudSchema);

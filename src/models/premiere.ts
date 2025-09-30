import { model, Schema } from "mongoose";

const PremiereSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date },
    discordMessageId: { type: String },

    artworkUrl: { type: String, required: true },
    audioUrl: { type: String, required: true },

    scTrackUrn: { type: String },
    scPrivateLink: { type: String },
    scPublicUrl: { type: String },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

export const Premiere = model("Premiere", PremiereSchema);

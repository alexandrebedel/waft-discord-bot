import { type InferSchemaType, model, Schema } from "mongoose";

export type Premiere = InferSchemaType<typeof PremiereSchema>;
export type PremiereStatus = Premiere["status"];

const PremiereSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, required: true },

    discordMessageId: { type: String },
    discordUserId: { type: String, required: true },

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

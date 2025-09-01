import {
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  model,
  Schema,
} from "mongoose";

export type SoundCloudAccount = Partial<{
  id: number;
  username: string;
  permalink: string;
  avatar_url: string;
}>;

export type SoundCloudAuth = InferSchemaType<typeof SoundCloudAuthSchema>;
export type SoundCloudAuthDocument = HydratedDocument<SoundCloudAuth>;
export interface SoundCloudAuthModel extends Model<SoundCloudAuth> {}

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

export const SoundCloudAuth = model<SoundCloudAuth, SoundCloudAuthModel>(
  "SoundCloudAuth",
  SoundCloudAuthSchema
);

import { z } from "zod";

const envSchema = z
  .object({
    MONGO_URI: z.url(),
    GOOGLE_APPLICATION_CREDENTIALS: z
      .string()
      .min(1, "GOOGLE_APPLICATION_CREDENTIALS is required"),
    GOOGLE_TRACKS_FOLDER: z.string().min(1, "GOOGLE_TRACKS_FOLDER is required"),
    DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
    DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),
    DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
    DISCORD_RELEASE_CHANNEL_ID: z
      .string()
      .min(1, "DISCORD_RELEASE_CHANNEL_ID is required"),
  })
  .transform((env) => ({
    mongoUri: env.MONGO_URI,
    googleCredentials: env.GOOGLE_APPLICATION_CREDENTIALS,
    googleTracksFolder: env.GOOGLE_TRACKS_FOLDER,
    discordClientId: env.DISCORD_CLIENT_ID,
    discordGuildId: env.DISCORD_GUILD_ID,
    discordToken: env.DISCORD_TOKEN,
    discordReleaseChannelId: env.DISCORD_RELEASE_CHANNEL_ID,
  }));

export const config = envSchema.parse(Bun.env);

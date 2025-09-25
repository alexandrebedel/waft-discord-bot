import { z } from "zod";

const envSchema = z
  .object({
    APP_URL: z.url(),
    MONGO_URI: z.url(),
    GOOGLE_APPLICATION_CREDENTIALS: z
      .string()
      .min(1, "GOOGLE_APPLICATION_CREDENTIALS is required"),
    GOOGLE_MAINLINE_FOLDER: z
      .string()
      .min(1, "GOOGLE_MAINLINE_FOLDER is required"),
    GOOGLE_SUBLINE_FOLDER: z
      .string()
      .min(1, "GOOGLE_SUBLINE_FOLDER is required"),
    GOOGLE_PREMIERES_FOLDER: z
      .string()
      .min(1, "GOOGLE_PREMIERES_FOLDER is required"),
    DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
    DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),
    DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
    DISCORD_RELEASE_CHANNEL_ID: z
      .string()
      .min(1, "DISCORD_RELEASE_CHANNEL_ID is required"),
    DISCORD_ADMIN_ROLE_ID: z
      .string()
      .min(1, "DISCORD_ADMIN_ROLE_ID is required"),
    SC_CLIENT_ID: z.string().min(1, "SC_CLIENT_ID is required"),
    SC_CLIENT_SECRET: z.string().min(1, "SC_CLIENT_SECRET is required"),
  })
  .transform((env) => {
    const cleanAppUrl = env.APP_URL.replace(/\/+$/, "");
    const scRedirectUri = `${cleanAppUrl}/soundcloud`;

    return {
      appUrl: env.APP_URL,
      mongoUri: env.MONGO_URI,
      googleCredentials: env.GOOGLE_APPLICATION_CREDENTIALS,
      googleMainlineFolder: env.GOOGLE_MAINLINE_FOLDER,
      googleSublineFolder: env.GOOGLE_SUBLINE_FOLDER,
      googlePremieresFolder: env.GOOGLE_PREMIERES_FOLDER,
      discordClientId: env.DISCORD_CLIENT_ID,
      discordGuildId: env.DISCORD_GUILD_ID,
      discordToken: env.DISCORD_TOKEN,
      discordReleaseChannelId: env.DISCORD_RELEASE_CHANNEL_ID,
      discordAdminRoleId: env.DISCORD_ADMIN_ROLE_ID,
      scClientId: env.SC_CLIENT_ID,
      scClientSecret: env.SC_CLIENT_SECRET,
      scRedirectUri,
      scDefaultTrackTags: [
        "techno",
        "hard",
        "hardgroove",
        "groovy",
        "underground",
        "waft",
      ],
    };
  });

export const config = envSchema.parse(Bun.env);

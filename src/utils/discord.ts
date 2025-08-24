import type { TextChannel } from "discord.js";
import { discordClient } from "../lib/discord";

if (!Bun.env.DISCORD_RELEASE_CHANNEL_ID) {
  throw new Error("No such env variable: DISCORD_RELEASE_CHANNEL_ID");
}

const channelId = Bun.env.DISCORD_RELEASE_CHANNEL_ID;

export async function sendMessageToReleaseChannel(content: string) {
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error("❌ Channel not found or is not text-based");
  }
  return await (channel as TextChannel).send(content);
}

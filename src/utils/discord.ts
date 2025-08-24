import { config } from "@waft/lib";
import type { MessageCreateOptions, MessagePayload, TextChannel } from "discord.js";
import { discordClient } from "../lib/discord";

export async function sendMessageToReleaseChannel(content: string | MessagePayload | MessageCreateOptions) {
  const channel = await discordClient.channels.fetch(
    config.discordReleaseChannelId
  );

  if (!channel || !channel.isTextBased()) {
    throw new Error("❌ Channel not found or is not text-based");
  }
  return await (channel as TextChannel).send(content);
}

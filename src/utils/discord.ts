import { config } from "@waft/lib";
import type {
  Message,
  MessageCreateOptions,
  MessagePayload,
  TextChannel,
} from "discord.js";
import { discordClient } from "../lib/discord";

export async function sendMessageToReleaseChannel(
  content: string | MessagePayload | MessageCreateOptions
) {
  const channel = await discordClient.channels.fetch(
    config.discordReleaseChannelId
  );

  if (!channel || !channel.isTextBased()) {
    throw new Error("❌ Channel not found or is not text-based");
  }
  return await (channel as TextChannel).send(content);
}

export async function startReleaseThread(message: Message, catalog: string) {
  try {
    const thread = await message.startThread({
      name: `${catalog} — discussion`.slice(0, 100),
      autoArchiveDuration: 10080, // 7 days
    });

    return thread.id;
  } catch {
    return null;
  }
}

export function renderTracklistLines(
  tracks: Array<{
    index: number;
    artist: string;
    title: string;
    driveWebViewLink?: string;
  }>
) {
  return tracks
    .sort((a, b) => a.index - b.index)
    .map((t) => {
      const base = `**${t.index}.** ${t.artist} — *${t.title}*`;

      return t.driveWebViewLink ? `${base} • <${t.driveWebViewLink}>` : base;
    })
    .join("\n");
}

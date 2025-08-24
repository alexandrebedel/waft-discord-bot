import type { seriesZ } from "@waft/validation";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import type z from "zod";

export function assertTextChannel(
  i: ChatInputCommandInteraction
): asserts i is ChatInputCommandInteraction & { channel: TextChannel } {
  if (!i.channel || i.channel.type !== ChannelType.GuildText) {
    throw new Error("This command must be used in a text channel.");
  }
}

// Derive series from catalog: "WAFT-001" -> null, "WAFT-FDL004" -> "FDL"
export function inferSeries(catalog: string) {
  const upper = catalog.toUpperCase();
  const main = /^WAFT-\d{3}$/;

  if (main.test(upper)) {
    return null;
  }
  const m = upper.match(/^WAFT-([A-Z]{2,6})\d{3}$/);

  return m ? (m[1] as z.infer<typeof seriesZ>) : null;
}

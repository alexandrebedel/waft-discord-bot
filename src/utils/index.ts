import {
  ChannelType,
  TextChannel,
  type ChatInputCommandInteraction,
} from "discord.js";

export function assertTextChannel(
  i: ChatInputCommandInteraction
): asserts i is ChatInputCommandInteraction & { channel: TextChannel } {
  if (!i.channel || i.channel.type !== ChannelType.GuildText) {
    throw new Error("This command must be used in a text channel.");
  }
}

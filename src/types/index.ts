import type { ChatInputCommandInteraction, TextChannel } from "discord.js";

export * from "./commands";
export * from "./routes";

export type WAFTCommandInteraction = ChatInputCommandInteraction & {
  channel: TextChannel;
};

import type { Interaction, SlashCommandBuilder } from "discord.js";

export interface IWAFTCommand<THandlerReturn = void> {
  command: SlashCommandBuilder;
  handler(interaction: Interaction): Promise<THandlerReturn>;
}

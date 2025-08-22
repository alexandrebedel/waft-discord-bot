import type { Interaction, SlashCommandBuilder } from "discord.js";

export interface IWAFTCommand<
  TCommand = SlashCommandBuilder,
  THandlerReturn = void
> {
  command: TCommand;
  handler(interaction: Interaction): Promise<THandlerReturn>;
  autocomplete?(interaction: Interaction): Promise<unknown>;
}

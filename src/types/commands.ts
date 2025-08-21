import type { Interaction, SlashCommandOptionsOnlyBuilder } from "discord.js";

export interface IWAFTCommand<
  TCommand = SlashCommandOptionsOnlyBuilder,
  THandlerReturn = void
> {
  command: TCommand;
  handler(interaction: Interaction): Promise<THandlerReturn>;
}

import type {
  AutocompleteInteraction,
  Interaction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
} from "discord.js";

export interface IWAFTCommand<
  TCommand = SlashCommandBuilder,
  THandlerReturn = void
> {
  command: TCommand;
  handler(interaction: Interaction): Promise<THandlerReturn>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<unknown>;
  modal?(interaction: ModalSubmitInteraction): Promise<unknown>;
}

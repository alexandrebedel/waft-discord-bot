import { SlashCommandBuilder, type Interaction } from "discord.js";
import type { IWAFTCommand } from "../../types/commands";

export default class PingComand implements IWAFTCommand {
  public command = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!");

  public async handler(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    await interaction.reply("Pong!");
  }
}

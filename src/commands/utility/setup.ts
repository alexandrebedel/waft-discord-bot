import { MessageFlags, SlashCommandBuilder, type Interaction } from "discord.js";
import type { IWAFTCommand } from "../../types/commands";
import { assertTextChannel } from "../../utils";

export default class SetupCommand implements IWAFTCommand {
  public command = new SlashCommandBuilder()
    .setName("setup")
    .setDescription(
      "Create/update the planning message for this EP in the current channel."
    )
    .addStringOption((o) =>
      o
        .setName("name")
        .setDescription("EP name, e.g. FreeDL Vol.4")
        .setRequired(true)
    );

  public async handler(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    assertTextChannel(interaction);

    const channel = interaction.channel;
    const name = interaction.options.getString("name", true).trim();

    await interaction.editReply({
      content:
        `✅ Planning set for **${name}** in <#${channel.id}>` +
        `\n💬 Thread: <#${1}>`,
    });
  }
}

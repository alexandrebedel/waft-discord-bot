import { CommandHandler } from "@waft/decorators";
import { buildAuthUrl, getMe } from "@waft/integrations/soundcloud";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import {
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import signale from "signale";

type ISoundcloudCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

export default class SoundCloudCommand implements ISoundcloudCommand {
  public command = new SlashCommandBuilder()
    .setName("sc")
    .setDescription("SoundCloud integration")
    .addSubcommand((sc) =>
      sc.setName("connect").setDescription("Connect the label account")
    )
    .addSubcommand((sc) =>
      sc.setName("me").setDescription("Show the connected account")
    );

  @CommandHandler()
  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    if (sub === "connect") {
      const url = buildAuthUrl();
      await interaction.editReply(`🔗 Connect SoundCloud:\n<${url}>`);
      return;
    }
    if (sub === "me") {
      try {
        const me = await getMe();
        await interaction.editReply(
            // @ts-expect-error
          `👤 Connected as **${me.username}** (id: ${me.id})`
        );
        return;
      } catch (err) {
        signale.error(err);
        // const msg = true
        //   ? `❌ ${err?.message ?? "Failed to fetch /me"}`
        //   : "❌ Not connected. Use `/sc connect` first.";

        interaction.editReply("test");
        return;
      }
    }
    interaction.editReply("Unknown subcommand.");
  }
}

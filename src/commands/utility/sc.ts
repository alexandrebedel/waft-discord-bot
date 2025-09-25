import { CommandHandler } from "@waft/decorators";
import { soundcloud } from "@waft/integrations";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import {
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import signale from "signale";
import { SoundCloudError, SoundCloudErrorType } from "../../errors";

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

    switch (sub) {
      case "connect": {
        const url = soundcloud.buildAuthUrl();

        await interaction.editReply(`🔗 Connect SoundCloud:\n<${url}>`);
        return;
      }
      case "me": {
        try {
          const me = await soundcloud.getMe();
          signale.log(me);
          await interaction.editReply(
            `👤 Connected as **${me.username}** (id: ${me.id})`
          );
          return;
        } catch (err) {
          signale.error(err);
          if (err instanceof SoundCloudError) {
            if (err.is(SoundCloudErrorType.NotConnected)) {
              await interaction.editReply(
                `❌ ${err.message}\n🔗 Run \`/sc connect\` to link SoundCloud.`
              );
              return;
            }
            if (err.is(SoundCloudErrorType.AuthExpired)) {
              await interaction.editReply(
                `⚠️ ${err.message}\n🔗 Please reconnect via \`/sc connect\`.`
              );
              return;
            }
          }

          const msg = err instanceof Error ? err.message : "Unexpected error";

          await interaction.editReply(`❌ ${msg}`);
          return;
        }
      }
    }
    interaction.editReply("Unknown subcommand.");
  }
}

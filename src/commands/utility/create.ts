import { RELEASE_TYPES, type ReleaseType } from "@waft/constants";
import { CommandHandler } from "@waft/decorators";
import { config } from "@waft/lib";
import { Release } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { pad } from "@waft/utils";
import { sendMessageToReleaseChannel } from "@waft/utils/discord";
import { type CreateReleaseZod, createReleaseZ } from "@waft/validation";
import {
  type Interaction,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";

type ISetupCommand = IWAFTCommand<SlashCommandOptionsOnlyBuilder>;

export default class CreateCommand implements ISetupCommand {
  public command = new SlashCommandBuilder()
    .setName("create")
    .setDescription(
      "Create the planning message for this EP in the current channel."
    )
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Type of release")
        .setRequired(true)
        .addChoices(...RELEASE_TYPES)
    )
    .addStringOption((o) =>
      o
        .setName("name")
        .setDescription("EP name, e.g. Free DL Series Vol.4")
        .setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName("catalog")
        .setDescription("Catalog number")
        .setRequired(true)
        .setMinValue(1)
    );

  @CommandHandler()
  public async handler(interaction: WAFTCommandInteraction) {
    const type = interaction.options
      .getString("type", true)
      .trim() as ReleaseType;
    const name = interaction.options.getString("name", true).trim();
    const catNumber = interaction.options.getInteger("catalog", true);

    const catalog =
      type === "FDL" || type === "COMP"
        ? `WAFT-${type}${pad(catNumber, 3)}`
        : `WAFT${pad(catNumber, 3)}`;

    const result = await this.parseCommands(type, name, catalog);
    const document = await Release.create(result);
    const message = await sendMessageToReleaseChannel({
      content: [
        `✨ **${catalog} — ${name} — Planning** ✨`,
        "",
        "Calendrier des sorties",
        "Merci d'updater l'état de vos tracks (fichier master, pochette, etc.) pour que tout roule 👌",
      ].join("\n"),
    });

    // TODO: clean this part
    try {
      await message.pin();
    } catch {}

    let threadId: string | undefined;
    try {
      const thread = await message.startThread({
        name: `${catalog} — discussion`.slice(0, 100),
        autoArchiveDuration: 10080, // 7 jours
      });
      threadId = thread.id;
    } catch {}

    document.planningMessageId = message.id;
    if (threadId) {
      document.threadId = threadId;
    }
    await document.save();
    await interaction.editReply({
      content:
        `✅ Planning créé pour **${name}** \`(${catalog})\` dans <#${message.channelId}>` +
        `\n📝 [Voir le message](${message.url})` +
        (threadId ? `\n💬 Thread: <#${threadId}>` : ""),
    });
  }

  private async parseCommands(
    type: ReleaseType,
    name: string,
    catalog: string
  ) {
    const payload: CreateReleaseZod = {
      catalog,
      type,
      title: name,
      channelId: config.discordReleaseChannelId,
    };

    return createReleaseZ.parse(payload);
  }
}

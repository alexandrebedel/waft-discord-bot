import { RELEASE_TYPES, type ReleaseType } from "@waft/constants";
import { CommandHandler } from "@waft/decorators";
import { gdrive } from "@waft/integrations";
import { config } from "@waft/lib";
import { Release } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { getCatalog } from "@waft/utils";
import {
  sendMessageToReleaseChannel,
  startReleaseThread,
} from "@waft/utils/discord";
import { type CreateReleaseZod, createReleaseZ } from "@waft/validation";
import {
  MessageFlags,
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
    const catNb = interaction.options.getInteger("catalog", true);

    const { document, folder } = await this.createRelease(catNb, name, type);
    const message = await sendMessageToReleaseChannel({
      content: [
        `✨ **${document.catalog} — ${name} — Planning** ✨`,
        "",
        "Calendrier des sorties",
        "Merci d'updater l'état de vos tracks (fichier master, pochette, etc.) pour que tout roule 👌",
        "",
        `📂 [Dossier Google Drive](${folder.webViewLink})`,
      ].join("\n"),
      flags: MessageFlags.SuppressEmbeds,
    });

    try {
      await message.pin();
    } catch {}

    document.planningMessageId = message.id;
    document.threadId = await startReleaseThread(message, document.catalog);
    await document.save();
    await interaction.editReply({
      content:
        `✅ Planning créé pour **${name}** \`(${document.catalog})\` dans <#${message.channelId}>` +
        `\n📝 [Voir le message](${message.url})` +
        (document.threadId ? `\n💬 Thread: <#${document.threadId}>` : ""),
    });
  }

  private async createRelease(
    catNumber: number,
    name: string,
    type: ReleaseType
  ) {
    const catalog = getCatalog(catNumber, type);
    const result = await this.parseCommands(type, name, catalog);
    const folder = await gdrive.createReleaseFolder(name, result.lineType);

    if (!folder.id) {
      throw new Error("Failed to create the release folder");
    }
    try {
      const document = await Release.create({
        ...result,
        driveFolderId: folder.id,
      });

      return { document, folder };
    } catch (err) {
      try {
        await gdrive.deleteFilesById(folder.id);
      } catch {}
      throw err;
    }
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
      lineType: catalog.includes("-") ? "subline" : "mainline", // Check si c'est ok sur le long terme
      channelId: config.discordReleaseChannelId,
    };

    return createReleaseZ.parse(payload);
  }
}

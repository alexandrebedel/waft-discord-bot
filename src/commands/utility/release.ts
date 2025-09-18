import { RELEASE_TYPES, type ReleaseType } from "@waft/constants";
import { CommandHandler } from "@waft/decorators";
import { gdrive } from "@waft/integrations";
import { config, discordClient } from "@waft/lib";
import { Release, Track } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { getCatalog } from "@waft/utils";
import {
  renderReleaseMessage,
  sendMessageToReleaseChannel,
  startReleaseThread,
} from "@waft/utils/discord";
import { type CreateReleaseZod, createReleaseZ } from "@waft/validation";
import {
  type AutocompleteInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import signale from "signale";
import { catalogOption, indexOption } from "../options";

type IReleaseCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

export default class ReleaseCommand implements IReleaseCommand {
  public command = new SlashCommandBuilder()
    .setName("release")
    .setDescription("Gestion des releases")
    .addSubcommand((sc) =>
      sc
        .setName("create")
        .setDescription(
          "Créé une nouvelle release et son message discord associé"
        )
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Type de release")
            .setRequired(true)
            .addChoices(...RELEASE_TYPES)
        )
        .addStringOption((o) =>
          o
            .setName("name")
            .setDescription("Nom de l'EP, e.g. Free DL Series Vol.4")
            .setRequired(true)
        )
        .addIntegerOption(indexOption("catalog", "Numéro du catalog"))
    )
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Supprime une release et toutes ses données")
        .addStringOption(catalogOption)
    );

  @CommandHandler({ requireAdminRole: true })
  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case "create":
        return this.handleCreate(interaction);
      case "delete":
        return this.handleDelete(interaction);
    }
  }

  public async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name !== "catalog") {
      return;
    }

    const q = String(focused.value || "").trim();
    const re = q.length
      ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : /.*/;

    const releases = await Release.find({ catalog: re })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("catalog title")
      .lean();

    await interaction.respond(
      releases.map((r) => ({
        name: r.title ? `${r.catalog} — ${r.title}` : r.catalog,
        value: r.catalog,
      }))
    );
  }

  private async handleCreate(interaction: WAFTCommandInteraction) {
    const type = interaction.options
      .getString("type", true)
      .trim() as ReleaseType;
    const name = interaction.options.getString("name", true).trim();
    const catNb = interaction.options.getInteger("catalog", true);

    const { document, folder } = await this.createRelease(catNb, name, type);
    const message = await sendMessageToReleaseChannel({
      content: renderReleaseMessage({
        catalog: document.catalog,
        title: name,
        driveUrl: folder.webViewLink!,
        tracks: [],
      }),
      flags: "SuppressEmbeds",
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

  private async handleDelete(interaction: WAFTCommandInteraction) {
    const catalog = interaction.options.getString("catalog", true).trim();
    const release = await Release.findOne({ catalog }).lean();

    if (!release) {
      throw new Error(`Release introuvable pour \`${catalog}\`.`);
    }
    if (release.channelId && release.planningMessageId) {
      try {
        const channel = await discordClient.channels.fetch(release.channelId);

        if (channel?.isTextBased()) {
          const msg = await channel.messages.fetch(release.planningMessageId);

          try {
            await msg.unpin();
          } catch {}
          try {
            await msg.delete();
          } catch {}
        }
      } catch {}
    }

    if (release.threadId) {
      try {
        const thread = await discordClient.channels.fetch(release.threadId);

        if (thread?.isThread()) {
          try {
            await thread.delete();
          } catch {}
        }
      } catch {}
    }

    try {
      await Track.deleteMany({ releaseId: release._id });
    } catch (e) {
      signale.error(e);
    }

    if (release.driveFolderId) {
      try {
        await gdrive.deleteFilesById(release.driveFolderId);
      } catch {}
    }

    await Release.deleteOne({ _id: release._id });
    await interaction.editReply({
      content: `🗑️ Release **${catalog}** supprimée (message, thread, tracks, dossier Drive).`,
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
      // @ts-expect-error
      if (err?.code === 11000) {
        throw new Error(
          `Une release avec le même catalog existe déjà (${catalog})`
        );
      }
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
      lineType: catalog.includes("-") ? "subline" : "mainline",
      channelId: config.discordReleaseChannelId,
    };

    return createReleaseZ.parse(payload);
  }
}

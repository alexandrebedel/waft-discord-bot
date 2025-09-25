import { RELEASE_TYPES, type ReleaseType } from "@waft/constants";
import { CommandHandler } from "@waft/decorators";
import { gdrive, soundcloud } from "@waft/integrations";
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
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import signale from "signale";
import { catalogAutocomplete } from "../autocomplete";
import { buildReleaseCreateModal } from "../modals";
import { catalogOption } from "../options";

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
    )
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Supprime une release et toutes ses données")
        .addStringOption(catalogOption)
    )
    .addSubcommand((s) =>
      s
        .setName("publish")
        .setDescription(
          "Crée une playlist SoundCloud depuis la release et y ajoute les tracks"
        )
        .addStringOption(catalogOption)
    );

  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case "create": {
        const type = interaction.options.getString("type", true) as ReleaseType;

        await buildReleaseCreateModal(interaction, type).show();
        break;
      }
      case "delete":
        await this.handleDelete(interaction);
        break;
      case "publish":
        await this.handlePublish(interaction);
        break;
    }
  }

  @CommandHandler({ autoDefer: false })
  public async modal(interaction: ModalSubmitInteraction) {
    const [prefix, action, type] = interaction.customId.split(":");

    if (prefix !== "release" || action !== "create" || !type) {
      return;
    }
    const values = interaction.fields;
    const name = values.getTextInputValue("name");
    const description = values.getTextInputValue("description");
    const catalog = values.getTextInputValue("catalog");
    // const releaseDate = values.getTextInputValue("release_date");
    const { document, folder } = await this.createRelease({
      catNumber: Number(catalog),
      name,
      type: type as ReleaseType,
      description,
    });

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
    await interaction.reply({
      content:
        `✅ Planning créé pour **${name}** \`(${document.catalog})\` dans <#${message.channelId}>` +
        `\n📝 [Voir le message](${message.url})` +
        (document.threadId ? `\n💬 Thread: <#${document.threadId}>` : ""),
      flags: "Ephemeral",
    });
  }

  public async autocomplete(interaction: AutocompleteInteraction) {
    return catalogAutocomplete(interaction);
  }

  @CommandHandler({ requireAdminRole: true })
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

  @CommandHandler({ requireAdminRole: true })
  private async handlePublish(interaction: WAFTCommandInteraction) {
    const catalog = interaction.options.getString("catalog", true);
    const release = await Release.findOne({ catalog }).lean();

    if (!release) {
      throw new Error(`Release introuvable pour \`${catalog}\`.`);
    }
    if (!release.soundcloudPlaylistId) {
      const pls = await soundcloud.createPlaylist({
        title: release.title,
        // trackIds: [scTrack.id],
        sharing: "private",
        tagList: config.scDefaultTrackTags,
        description: `Catalog: ${release.catalog}`,
      });

      signale.log(pls);
    }
  }

  private async createPlaylist() {
    void 0;
  }

  private async createRelease(params: {
    type: ReleaseType;
    catNumber: number;
    name: string;
    description: string;
  }) {
    const { catNumber, type, name, description } = params;
    const catalog = getCatalog(catNumber, type);
    const result = await this.parseCommands(type, name, catalog, description);
    const folder = await gdrive.createReleaseFolder(name, result.lineType);

    if (!folder.id) {
      throw new Error("Je n'ai pas réussi à créer le dossier dans le drive...");
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
    catalog: string,
    description: string
  ) {
    // TODO: release date
    const payload: CreateReleaseZod = {
      catalog,
      type,
      title: name,
      description,
      lineType: catalog.includes("-") ? "subline" : "mainline",
      channelId: config.discordReleaseChannelId,
    };

    return createReleaseZ.parse(payload);
  }
}

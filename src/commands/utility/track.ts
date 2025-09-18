import { hyperlink } from "@discordjs/formatters";
import { CommandHandler } from "@waft/decorators";
import { gdrive } from "@waft/integrations";
import { discordClient } from "@waft/lib";
import { Release, Track } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { renderReleaseMessage } from "@waft/utils/discord";
import { driveUrl, extractDriveId } from "@waft/utils/google";
import { trackAddZ } from "@waft/validation";
import {
  type AutocompleteInteraction,
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { buildTrackModal } from "../modals";

export type ITrackCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

export default class TrackCommand implements ITrackCommand {
  public command = new SlashCommandBuilder()
    .setName("track")
    .setDescription("Ajoute une track à une release")
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Ajoute une track à la tracklist")
        .addStringOption((o) =>
          o
            .setName("catalog")
            .setDescription("Catalog")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((o) =>
          o
            .setName("status")
            .setDescription("Le status de la track")
            .addChoices(
              { name: "Premaster", value: "premaster" },
              { name: "Master", value: "master" }
            )
            .setRequired(false)
        )
    );

  @CommandHandler({ autoDefer: false })
  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case "add":
        await buildTrackModal(interaction).show();
        break;
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

  @CommandHandler({ autoDefer: false })
  public async modal(interaction: ModalSubmitInteraction) {
    const [, action, encodedCatalog, statusRaw] =
      interaction.customId.split(":");
    if (action !== "add") return;

    const parsed = trackAddZ.parse({
      catalog: decodeURIComponent(encodedCatalog!),
      status: statusRaw ?? "premaster",
      index: interaction.fields.getTextInputValue("index"),
      artist: interaction.fields.getTextInputValue("artist"),
      title: interaction.fields.getTextInputValue("title"),
      releaseDateStr: interaction.fields.getTextInputValue("release_date"),
      driveUrl: interaction.fields.getTextInputValue("drive_url"),
    });

    const { catalog, status, index, artist, title, releaseDate, driveUrl } =
      parsed;
    const release = await Release.findOne({ catalog }).lean();

    if (!release) {
      throw new Error(`Release introuvable pour \`${catalog}\`.`);
    }

    const driveMeta = await this.checkDriveFile(driveUrl);

    try {
      await Track.create({
        releaseId: release._id,
        index,
        artist,
        title,
        status,
        releaseDate,
        ...(driveMeta && {
          driveFileId: driveMeta.id,
          driveWebViewLink: driveMeta.webViewLink,
          filename: driveMeta.name,
          mimetype: driveMeta.mimeType,
          size: driveMeta.size ? Number(driveMeta.size) : undefined,
        }),
        createdByUserId: interaction.user.id,
      });
    } catch (e) {
      // @ts-expect-error
      if (e?.code === 11000) {
        throw new Error(
          `Une track à la position ${index} de la tracklist est déjà en place pour cette release.`
        );
      }
      throw e;
    }

    await this.updateReleaseMessage(release._id.toString());
    const link = driveMeta?.webViewLink
      ? ` • ${hyperlink("Drive", driveMeta.webViewLink)}`
      : "";
    return interaction.reply({
      content: `✅ Track **${index}. ${artist} — _${title}_** ajoutée à **${catalog}**${link}.`,
      flags: "Ephemeral",
    });
  }

  private async checkDriveFile(driveUrl: string) {
    if (!driveUrl) {
      return;
    }

    const ex = extractDriveId(driveUrl);

    if (ex.type !== "file" || !ex.id) {
      throw new Error("Lien Drive invalide (attendu: lien *fichier*).");
    }

    const meta = await gdrive.getFileMeta(ex.id);

    if (!gdrive.isLosslessAudio(meta)) {
      throw new Error(
        "Le fichier ne semble pas être un audio lossless valide (WAV/AIFF/FLAC)."
      );
    }
    return meta;
  }

  private async updateReleaseMessage(releaseId: string) {
    const release = await Release.findById(releaseId)
      .select("catalog title driveFolderId channelId planningMessageId")
      .lean();

    if (!release?.channelId || !release?.planningMessageId) {
      return;
    }

    const tracks = await Track.find({ releaseId })
      .select("index artist title status releaseDate driveWebViewLink")
      .lean();

    const content = renderReleaseMessage({
      catalog: release.catalog,
      title: release.title ?? "",
      driveUrl: driveUrl(release.driveFolderId),
      tracks,
    });

    const channel = await discordClient.channels.fetch(release.channelId);

    if (!channel?.isTextBased()) {
      return;
    }

    const msg = await channel.messages.fetch(release.planningMessageId);

    if (!msg) {
      return;
    }
    if (msg.content !== content) {
      await msg.edit({ content, flags: "SuppressEmbeds" });
    }
  }
}

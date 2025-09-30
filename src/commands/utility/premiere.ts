import { CommandHandler } from "@waft/decorators";
import { gdrive } from "@waft/integrations";
import { config, discordClient } from "@waft/lib";
import { Premiere } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { pad } from "@waft/utils";
import { renderPremiereMessage, sendMessageTo } from "@waft/utils/discord";
import { extractDriveId } from "@waft/utils/google";
import { premiereCreateZ } from "@waft/validation";
import {
  type AutocompleteInteraction,
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  type SlashCommandStringOption,
  type SlashCommandSubcommandsOnlyBuilder,
  type TextChannel,
} from "discord.js";
import { isValidObjectId } from "mongoose";
import { buildPremiereCreateModal } from "../modals";

export type IPremiereCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

const premiereOption = (o: SlashCommandStringOption) =>
  o
    .setName("id")
    .setDescription("Sélectionne la première à publier")
    .setAutocomplete(true)
    .setRequired(true);

export default class PremiereCommand implements IPremiereCommand {
  public command = new SlashCommandBuilder()
    .setName("premiere")
    .setDescription("Gérer les premières SoundCloud")
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Ouvre le formulaire pour créer une première")
    )
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Supprime une première")
        .addStringOption(premiereOption)
    )
    .addSubcommand((sc) =>
      sc
        .setName("publish")
        .setDescription(
          "Publie une première sur SoundCloud (upload + schedule)"
        )
        .addStringOption(premiereOption)
    );

  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case "add": {
        await buildPremiereCreateModal(interaction).show();
        break;
      }
      case "delete": {
        await this.delete(interaction);
        break;
      }
      case "publish": {
        await this.publish(interaction);
        break;
      }
      default:
        break;
    }
  }

  public async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name !== "id") {
      return;
    }
    const q = String(focused.value || "").trim();
    const re = q.length
      ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : /.*/;

    const items = await Premiere.find({ title: re })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("title scheduledAt")
      .lean();

    const toShort = (d?: Date) =>
      d
        ? `${pad(d.getDate(), 2)}/${pad(d.getMonth() + 1, 2)}/${String(
            d.getFullYear()
          ).slice(2, 4)}`
        : "??/??";
    await interaction.respond(
      items.map((p) => ({
        name: `${p.title} — ${toShort(p.scheduledAt ?? undefined)}`.slice(
          0,
          100
        ),
        value: String(p._id),
      }))
    );
  }

  @CommandHandler({ autoDefer: false })
  public async modal(interaction: ModalSubmitInteraction) {
    const [root, action] = interaction.customId.split(":");

    if (root !== "premiere" || action !== "create") {
      return;
    }
    const values = await this.checkValues(interaction);
    const premiere = await Premiere.create({
      ...values,
      discordUserId: interaction.user.id,
    });
    const content = await renderPremiereMessage(premiere);
    const msg = await sendMessageTo("premieres", content);

    premiere.discordMessageId = msg.id;
    await premiere.save();
    return interaction.reply({
      content: `✅ Première créée (draft) <#${msg.channelId}>.`,
      flags: "Ephemeral",
    });
  }

  @CommandHandler({ autoDefer: false, requireAdminRole: true })
  private async delete(interaction: WAFTCommandInteraction) {
    const id = interaction.options.getString("id", true);

    if (!isValidObjectId(id)) {
      throw new Error(`Première introuvable pour \`${id}\`.`);
    }
    const premiere = await Premiere.findById(id);

    if (!premiere) {
      throw new Error(`Première introuvable pour \`${id}\`.`);
    }
    if (premiere.discordMessageId) {
      const channel = await discordClient.channels
        .fetch(config.discordPremiereChannelId)
        .catch(() => null);

      if (channel?.isTextBased()) {
        const msg = await (channel as TextChannel).messages
          .fetch(premiere.discordMessageId)
          .catch(() => null);

        if (msg) {
          await msg.delete().catch(() => null);
        }
      }
    }
    await Premiere.deleteOne({ _id: id });
    return interaction.reply({
      content: `🗑️ Première **${premiere.title}** supprimée.`,
      flags: "Ephemeral",
    });
  }

  @CommandHandler({ autoDefer: false, requireAdminRole: true })
  private async publish(interaction: WAFTCommandInteraction) {
    const id = interaction.options.getString("id", true);

    if (!isValidObjectId(id)) {
      throw new Error(`Première introuvable pour \`${id}\`.`);
    }

    const premiere = await Premiere.findById(id);
    if (!premiere) {
      throw new Error(`Première introuvable pour \`${id}\`.`);
    }

    if (premiere.status === "scheduled") {
      return interaction.reply({
        content: "ℹ️ Cette première est déjà **scheduled** sur SoundCloud.",
        flags: "Ephemeral",
      });
    }

    if (!premiere.scheduledAt) {
      throw new Error(
        "Cette première n'a pas de date planifiée (`scheduledAt`)."
      );
    }

    const audioEx = extractDriveId(premiere.audioUrl);
    const artworkEx = extractDriveId(premiere.artworkUrl);

    if (audioEx.type !== "file" || !audioEx.id) {
      throw new Error("Lien Drive audio invalide (attendu: lien *fichier*).");
    }
    if (artworkEx.type !== "file" || !artworkEx.id) {
      throw new Error("Lien Drive artwork invalide (attendu: lien *fichier*).");
    }

    const [audioMeta, artworkMeta] = await Promise.all([
      gdrive.getFileMeta(audioEx.id),
      gdrive.getFileMeta(artworkEx.id),
    ]);

    if (!gdrive.isLosslessAudio(audioMeta)) {
      throw new Error(
        "Le fichier audio n'est pas un lossless valide (WAV/AIFF/FLAC)."
      );
    }
    if (!String(artworkMeta.mimeType || "").startsWith("image/")) {
      throw new Error(
        "Le fichier artwork n'est pas une image (mime image/* requis)."
      );
    }

    // Upload + schedule sur SoundCloud (API intégration)
    // On suppose que l'intégration expose cette méthode utilitaire.
    // const result = await soundcloud.schedulePremiereFromDrive({
    //   title: premiere.title,
    //   description: premiere.description,
    //   scheduledAt: premiere.scheduledAt, // Date
    //   audioDriveFileId: audioEx.id,
    //   artworkDriveFileId: artworkEx.id,
    // });
    // result est supposé contenir: { urn: string, privateUrl?: string, publicUrl?: string }

    // Mise à jour du document
    // premiere.scUrn = result?.urn ?? premiere.scUrn;
    // premiere.scPrivateLink = result?.privateUrl ?? premiere.scPrivateLink;
    // if (result?.publicUrl) {
    //   premiere.scPublicUrl = result.publicUrl;
    // }
    // premiere.status = "scheduled";
    // await premiere.save();

    // // Mise à jour du message Discord s'il existe
    // if (premiere.discordMessageId) {
    //   const channel = await discordClient.channels
    //     .fetch(config.discordPremiereChannelId)
    //     .catch(() => null);

    //   if (channel?.isTextBased()) {
    //     const msg = await (channel as TextChannel).messages
    //       .fetch(premiere.discordMessageId)
    //       .catch(() => null);
    //     if (msg) {
    //       const content = renderPremiereMessage({
    //         title: premiere.title,
    //         description: premiere.description,
    //         scheduledAt: premiere.scheduledAt,
    //         artworkUrl: premiere.artworkUrl,
    //         audioUrl: premiere.audioUrl,
    //         scPrivateLink: premiere.scPrivateLink ?? undefined,
    //         scPublicUrl: premiere.scPublicUrl ?? undefined,
    //       });
    //       await msg.edit({ content, flags: "SuppressEmbeds" });
    //     }
    //   }
    // }

    return interaction.reply({
      content: `✅ Première **${premiere.title}** programmée sur SoundCloud${
        premiere.scPrivateLink ? ` — lien privé: ${premiere.scPrivateLink}` : ""
      }.`,
      flags: "Ephemeral",
    });
  }

  private async checkValues(interaction: ModalSubmitInteraction) {
    const parsed = premiereCreateZ.parse({
      title: interaction.fields.getTextInputValue("title"),
      description: interaction.fields.getTextInputValue("description"),
      artworkUrl: interaction.fields.getTextInputValue("artwork_url"),
      audioUrl: interaction.fields.getTextInputValue("audio_url"),
      releaseDateStr: interaction.fields.getTextInputValue("release_date"),
    });

    // TODO: move this logic to util
    const audioEx = extractDriveId(parsed.audioUrl);
    const artworkEx = extractDriveId(parsed.artworkUrl);

    if (audioEx.type !== "file" || !audioEx.id) {
      throw new Error("Lien Drive audio invalide (attendu: lien *fichier*).");
    }
    if (artworkEx.type !== "file" || !artworkEx.id) {
      throw new Error("Lien Drive artwork invalide (attendu: lien *fichier*).");
    }

    const [audioMeta, artworkMeta] = await Promise.all([
      gdrive.getFileMeta(audioEx.id),
      gdrive.getFileMeta(artworkEx.id),
    ]);

    if (!gdrive.isLosslessAudio(audioMeta)) {
      throw new Error(
        `Le fichier audio n'est pas un lossless valide (WAV/AIFF/FLAC): reçu: ${audioMeta.mimeType}.`
      );
    }
    if (!String(artworkMeta.mimeType || "").startsWith("image/")) {
      throw new Error(
        `Le fichier artwork n'est pas une image (mime image/* requis): reçu: ${artworkMeta.mimeType}.`
      );
    }
    return parsed;
  }
}

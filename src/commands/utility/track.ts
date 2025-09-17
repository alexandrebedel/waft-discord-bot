import { CommandHandler } from "@waft/decorators";
import { gdrive } from "@waft/integrations";
import { updateReleaseMessage } from "@waft/lib";
import { Release, Track } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { extractDriveId } from "@waft/utils/google";
import {
  AutocompleteInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import signale from "signale";

type ITracklistCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

export default class TrackCommand implements ITracklistCommand {
  public command = new SlashCommandBuilder()
    .setName("track")
    .setDescription("Manage release tracks")
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Add a single track")
        .addStringOption((o) =>
          o
            .setName("catalog")
            .setDescription("Catalog")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((o) =>
          o.setName("index").setDescription("Index (1-based)").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("artist").setDescription("Artist").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("title").setDescription("Title").setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("status")
            .setDescription("Track status")
            .addChoices(
              { name: "Premaster", value: "premaster" },
              { name: "Master", value: "master" }
            )
            .setRequired(false)
        )

        .addStringOption((o) =>
          o
            .setName("drive_url")
            .setDescription("Google Drive file link")
            .setRequired(false)
        )
    );

  @CommandHandler({ autoDefer: false })
  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case "add":
        this.handleAdd(interaction);
        break;
    }
    signale.info("done");
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

  private async handleAdd(interaction: WAFTCommandInteraction) {
    const catalog = interaction.options.getString("catalog", true).trim();
    const index = interaction.options.getInteger("index", true);
    const artist = interaction.options.getString("artist", true).trim();
    const title = interaction.options.getString("title", true).trim();
    const driveUrl = interaction.options.getString("drive_url", false)?.trim();
    const status = interaction.options.getString("status", false)?.trim();

    if (index < 1) {
      return interaction.reply({
        content: "❌ `index` doit être ≥ 1 (1-based).",
        flags: "Ephemeral",
      });
    }

    const release = await Release.findOne({ catalog }).lean();

    if (!release) {
      return interaction.reply({
        content: `❌ Release introuvable pour \`${catalog}\`.`,
        flags: "Ephemeral",
      });
    }

    if (!driveUrl) return;

    const ex = extractDriveId(driveUrl);

    if (ex.type !== "file" || !ex.id) {
      return interaction.reply({
        content: "❌ Lien Drive invalide (attendu: lien *fichier*).",
        flags: "Ephemeral",
      });
    }

    const meta = await gdrive.getFileMeta(ex.id);

    if (!gdrive.isLosslessAudio(meta)) {
      return interaction.reply({
        content:
          "❌ Le fichier ne sembla être un fichier audio valide / pas lossless",
        flags: "Ephemeral",
      });
    }
    try {
      await Track.findOneAndUpdate(
        { releaseId: release._id, index },
        {
          $set: {
            artist,
            title,
            status,
            driveWebViewLink: meta.webViewLink,
            filename: meta.name,
            mimetype: meta.mimeType,
            size: meta.size,
          },
          $setOnInsert: { createdByUserId: interaction.user.id },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (e) {
      signale.error(e);
      return interaction.reply({
        content: "❌ Une erreur est survenue",
        flags: "Ephemeral",
      });
    }

    // TODO: improve
    await updateReleaseMessage(release._id.toString());

    const link = meta.webViewLink ? ` • [Drive](${meta.webViewLink})` : "";
    return interaction.reply({
      content: `✅ Track **${index}. ${artist} — _${title}_** ajoutée à **${catalog}**${link}.`,
      flags: "Ephemeral",
    });
  }
}

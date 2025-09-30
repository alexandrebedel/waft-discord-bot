import { CommandHandler } from "@waft/decorators";
import { config, discordClient } from "@waft/lib";
import { Premiere } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { pad } from "@waft/utils";
import { renderPremiereMessage, sendMessageTo } from "@waft/utils/discord";
import { premiereCreateZ } from "@waft/validation";
import {
  AutocompleteInteraction,
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
  TextChannel,
} from "discord.js";
import { isValidObjectId } from "mongoose";
import { buildPremiereCreateModal } from "../modals";

export type IPremiereCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

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
        .addStringOption((o) =>
          o
            .setName("id")
            .setDescription("Sélctionne la première à supprimer")
            .setAutocomplete(true)
            .setRequired(true)
        )
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
      default:
        break;
    }
  }

  public async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    console.log(focused);
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
    const premiere = await Premiere.create(
      premiereCreateZ.parse({
        title: interaction.fields.getTextInputValue("title"),
        description: interaction.fields.getTextInputValue("description"),
        artworkUrl: interaction.fields.getTextInputValue("artwork_url"),
        audioUrl: interaction.fields.getTextInputValue("audio_url"),
        releaseDateStr: interaction.fields.getTextInputValue("release_date"),
      })
    );
    const content = renderPremiereMessage(premiere);
    const msg = await sendMessageTo("premieres", {
      content,
      flags: "SuppressEmbeds",
    });

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
}

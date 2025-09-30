import type { WAFTCommandInteraction } from "@waft/types";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export function buildTrackModal(interaction: WAFTCommandInteraction) {
  const catalog = interaction.options.getString("catalog", true).trim();
  const status =
    (interaction.options.getString("status", false)?.trim() as
      | "premaster"
      | "master"
      | null) ?? "premaster";

  const modal = new ModalBuilder()
    .setCustomId(`track:add:${encodeURIComponent(catalog)}:${status}`)
    .setTitle(`Ajouter une track — ${catalog}`);

  const artistInput = new TextInputBuilder()
    .setCustomId("artist")
    .setLabel("Artist")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Title")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description")
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph);

  const dateInput = new TextInputBuilder()
    .setCustomId("release_date")
    .setLabel("Release date (YYYY-MM-DD ou DD/MM/YYYY)")
    .setRequired(false)
    .setStyle(TextInputStyle.Short);

  const urlInput = new TextInputBuilder()
    .setCustomId("drive_url")
    .setLabel("Google Drive file link (optionnel)")
    .setRequired(false)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(artistInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput)
  );
  return { show: () => interaction.showModal(modal) };
}

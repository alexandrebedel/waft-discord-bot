import type { WAFTCommandInteraction } from "@waft/types";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export function buildPremiereCreateModal(interaction: WAFTCommandInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("premiere:create")
    .setTitle("Créer une première");

  const title = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Titre de la premiere")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const description = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const releaseDate = new TextInputBuilder()
    .setCustomId("release_date")
    .setLabel("Date de release (DD/MM/YYYY HH:MM)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const artworkUrl = new TextInputBuilder()
    .setCustomId("artwork_url")
    .setLabel("Lien de l'artwork (Lien Drive)")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const audioUrl = new TextInputBuilder()
    .setCustomId("audio_url")
    .setLabel("Lien du fichier audio (Lien Drive)")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(title),
    new ActionRowBuilder<TextInputBuilder>().addComponents(description),
    new ActionRowBuilder<TextInputBuilder>().addComponents(releaseDate),
    new ActionRowBuilder<TextInputBuilder>().addComponents(artworkUrl),
    new ActionRowBuilder<TextInputBuilder>().addComponents(audioUrl)
  );
  return { show: () => interaction.showModal(modal) };
}

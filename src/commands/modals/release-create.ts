import type { ReleaseType } from "@waft/constants";
import type { WAFTCommandInteraction } from "@waft/types";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export function buildReleaseCreateModal(
  interaction: WAFTCommandInteraction,
  type: ReleaseType
) {
  const modal = new ModalBuilder()
    .setCustomId(`release:create:${type}`)
    .setTitle("Créer une release");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("Nom de la release (ex: Free DL Series Vol.4)")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const catalogInput = new TextInputBuilder()
    .setCustomId("catalog")
    .setLabel("Numéro du catalog (ex: 4)")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const descInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description")
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph);

  const dateInput = new TextInputBuilder()
    .setCustomId("release_date")
    .setLabel("Date de sortie")
    .setPlaceholder("YYYY-MM-DD HH:mm ou DD/MM/YYYY HH:mm")
    .setRequired(false)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(catalogInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput)
  );
  return { show: () => interaction.showModal(modal) };
}

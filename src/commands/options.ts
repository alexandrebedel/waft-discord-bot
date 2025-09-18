import type { SlashCommandStringOption } from "discord.js";

export const catalogOption = (o: SlashCommandStringOption) =>
  o
    .setName("catalog")
    .setDescription("Catalog")
    .setRequired(true)
    .setAutocomplete(true);

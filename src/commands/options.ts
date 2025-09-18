import type {
  SlashCommandIntegerOption,
  SlashCommandStringOption,
} from "discord.js";

export const catalogOption = (o: SlashCommandStringOption) =>
  o
    .setName("catalog")
    .setDescription("Catalog")
    .setRequired(true)
    .setAutocomplete(true);

export const indexOption =
  (name = "index", description = "Index (1-based) de la track à modifier") =>
  (o: SlashCommandIntegerOption) =>
    o
      .setName(name)
      .setDescription(description)
      .setRequired(true)
      .setMinValue(1);

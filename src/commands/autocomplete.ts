import { Release } from "@waft/models";
import type { AutocompleteInteraction } from "discord.js";

export async function catalogAutocomplete(
  interaction: AutocompleteInteraction
) {
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

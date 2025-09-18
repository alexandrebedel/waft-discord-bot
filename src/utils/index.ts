import type { WAFTCommandInteraction } from "@waft/types";
import { ChannelType, type ChatInputCommandInteraction } from "discord.js";

export const pad = (str: string | number, len: number) =>
  str.toString().padStart(len, "0");

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function assertTextChannel(
  i: ChatInputCommandInteraction
): asserts i is WAFTCommandInteraction {
  if (!i.channel || i.channel.type !== ChannelType.GuildText) {
    throw new Error("This command must be used in a text channel.");
  }
}

export function getCatalog(catNumber: number, type?: string) {
  return type === "FDL" || type === "COMP"
    ? `WAFT-${type}${pad(catNumber, 3)}` // subline
    : `WAFT${pad(catNumber, 3)}`; // mainline
}

// Derive series from catalog: "WAFT001" -> null, "WAFT-FDL004" -> "FDL"
// export function inferSeries(catalog: string) {
//   const upper = catalog.toUpperCase();
//   const main = /^WAFT\d{3}$/;

//   if (main.test(upper)) {
//     return null;
//   }
//   const m = upper.match(/^WAFT-([A-Z]{2,6})\d{3}$/);

//   return m ? (m[1] as z.infer<typeof seriesZ>) : null;
// }

// import { CommandHandler } from "@waft/decorators";
// import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
// import {
//   SlashCommandBuilder,
//   type SlashCommandSubcommandsOnlyBuilder,
// } from "discord.js";
// import signale from "signale";
// import set from "./set";

// type ITracklistCommand = IWAFTCommand<SlashCommandSubcommandsOnlyBuilder>;

// export default class TracklistSetCommand implements ITracklistCommand {
//   public command = new SlashCommandBuilder()
//     .setName("tracklist")
//     .setDescription("Manage release tracklist")
//     .addSubcommand((sc) =>
//       sc
//         .setName("set")
//         .setDescription("Define the full tracklist via a modal")
//         .addStringOption((o) =>
//           o.setName("catalog").setDescription("Catalog").setRequired(true)
//         )
//     )
//     .addSubcommand((sc) =>
//       sc
//         .setName("add")
//         .setDescription("Add a single track")
//         .addStringOption((o) =>
//           o.setName("catalog").setDescription("Catalog").setRequired(true)
//         )
//         .addIntegerOption((o) =>
//           o.setName("index").setDescription("Index").setRequired(true)
//         )
//         .addStringOption((o) =>
//           o.setName("artist").setDescription("Artist").setRequired(true)
//         )
//         .addStringOption((o) =>
//           o.setName("title").setDescription("Title").setRequired(true)
//         )
//     )
//     .addSubcommand((sc) =>
//       sc
//         .setName("show")
//         .setDescription("Show current tracklist")
//         .addStringOption((o) =>
//           o.setName("catalog").setDescription("Catalog").setRequired(true)
//         )
//     );

//   @CommandHandler({ autoDefer: false })
//   public async handler(interaction: WAFTCommandInteraction) {
//     const sub = interaction.options.getSubcommand(true);

//     signale.info(sub);
//     switch (sub) {
//       case "show":
//         return set.handler(interaction);
//       default:
//         interaction.reply({
//           content: "Unknown subcommand",
//           ephemeral: true,
//         });
//     }
//   }
// }

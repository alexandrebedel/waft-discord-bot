import {
  type Interaction,
  MessageFlags,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { ZodError } from "zod";
import { Release } from "../../models/release";
import type { IWAFTCommand } from "../../types/commands";
import { assertTextChannel, inferSeries } from "../../utils";
import { sendMessageToReleaseChannel } from "../../utils/discord";
import { type CreateReleaseZod, createReleaseZ } from "../../validation";

type ISetupCommand = IWAFTCommand<SlashCommandOptionsOnlyBuilder>;

export default class CreateCommand implements ISetupCommand {
  public command = new SlashCommandBuilder()
    .setName("create")
    .setDescription(
      "Create the planning message for this EP in the current channel."
    )
    .addStringOption((o) =>
      o
        .setName("name")
        .setDescription("EP name, e.g. Free DL Series Vol.4")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("catalog")
        .setDescription("Catalog name, e.g. WAFT001, WAFT-FDL005")
        .setRequired(true)
    );

  public async handler(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    assertTextChannel(interaction);

    const channel = interaction.channel;
    const name = interaction.options.getString("name", true).trim();
    const catalog = interaction.options.getString("catalog", true).trim();
    const result = await this.parseCommands(name, catalog, interaction);

    if (!result.ok) {
      await interaction.editReply(`❌ ${result.msg}`);
      return;
    }

    const document = await Release.create(result.data);

    await document.save();
    await interaction.editReply({
      content:
        `✅ Planning set for **${name}** in <#${channel.id}>` +
        `\n💬 Thread: <#${1}>`,
    });
    await sendMessageToReleaseChannel("Yoooo");
  }

  private async parseCommands(
    name: string,
    catalog: string,
    interaction: Interaction
  ) {
    const payload: CreateReleaseZod = {
      catalog,
      series: inferSeries(catalog),
      type: "EP",
      title: name,
      channelId: interaction.channel!.id,
    };

    try {
      const data = createReleaseZ.parse(payload);

      return { ok: true, data };
    } catch (err) {
      const msg =
        err instanceof ZodError
          ? err.issues.map((i) => i.message).join("\n")
          : "Invalid input.";

      return { ok: false, msg };
    }
  }
}

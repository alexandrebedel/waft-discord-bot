import { CommandHandler } from "@waft/decorators";
import { Premiere } from "@waft/models";
import type { IWAFTCommand, WAFTCommandInteraction } from "@waft/types";
import { renderPremiereMessage, sendMessageTo } from "@waft/utils/discord";
import { premiereCreateZ } from "@waft/validation";
import {
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
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
    );

  public async handler(interaction: WAFTCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case "add": {
        await buildPremiereCreateModal(interaction).show();
        break;
      }
      default:
        break;
    }
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
}

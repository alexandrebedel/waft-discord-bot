import { config } from "@waft/lib";
import { assertTextChannel } from "@waft/utils";
import {
  type ChatInputCommandInteraction,
  type GuildMemberRoleManager,
  type Interaction,
  MessageFlags,
} from "discord.js";
import signale from "signale";
import { ZodError } from "zod";

type CommandHandlerOptions = {
  skipTextChannelAssertion?: boolean;
  autoDefer?: boolean;
  requireAdminRole?: boolean;
};

function extractErrorMsg(err: unknown) {
  let msg = "❌ Something went wrong";

  if (err instanceof ZodError) {
    msg =
      "❌ " +
      err.issues
        .map((i) => {
          const path = i.path?.length ? `${i.path.join(".")}: ` : "";

          return `${path}${i.message}`;
        })
        .join("\n");
  } else if (err instanceof Error && err.message) {
    msg = `❌ ${err.message}`;
  }
  return msg;
}

export function CommandHandler(options: CommandHandlerOptions = {}) {
  const shouldAutoDefer = options.autoDefer ?? true;

  return (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const original = descriptor.value;

    if (typeof original !== "function") {
      signale.warn(
        `@CommandHandler: "${String(propertyKey)}" is not a function`
      );
      return descriptor;
    }
    descriptor.value = async function (
      interaction: ChatInputCommandInteraction
    ) {
      try {
        if (shouldAutoDefer && !interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        if (!options.skipTextChannelAssertion) {
          assertTextChannel(interaction);
        }
        if (options.requireAdminRole) {
          assertIsAdmin(interaction);
        }
        return await original.call(this, interaction);
      } catch (err) {
        const msg = extractErrorMsg(err);

        signale.error(`Error in ${String(propertyKey)}`, err);
        if (!interaction.isRepliable()) {
          return;
        }
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(msg);
          return;
        }
        await interaction.reply({
          content: msg,
          flags: MessageFlags.Ephemeral,
        });
      }
    };
    return descriptor;
  };
}

function assertIsAdmin(interaction: Interaction) {
  const member = interaction.member;

  if (!member || !("roles" in member)) {
    throw new Error("Impossible de vérifier tes rôles.");
  }

  const roles = (member.roles as GuildMemberRoleManager).cache;

  if (!roles.has(config.discordAdminRoleId)) {
    throw new Error("Tu n'as pas la permission d'exécuter cette commande.");
  }
}

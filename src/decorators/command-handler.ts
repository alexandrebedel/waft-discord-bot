import { assertTextChannel } from "@waft/utils";
import { type Interaction, MessageFlags } from "discord.js";
import signale from "signale";
import { ZodError } from "zod";

type CommandHandlerOptions = { skipTextChannelAssertion?: boolean };
// type TypedCommandHandler<TOpts extends CommandHandlerOptions> = (
//   interaction: TOpts["skipTextChannelAssertion"] extends true
//     ? Interaction
//     : WAFTCommandInteraction
// ) => Promise<void>;

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
    descriptor.value = async function (interaction: Interaction) {
      try {
        if (!interaction.isChatInputCommand()) {
          return;
        }
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        if (!options.skipTextChannelAssertion) {
          assertTextChannel(interaction);
        }
        return await original.call(this, interaction);
      } catch (err) {
        const msg = extractErrorMsg(err);

        signale.error(`Error in ${String(propertyKey)}`, err);
        if (interaction.isRepliable()) {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(msg);
          } else {
            await interaction.reply({
              content: msg,
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    };
    return descriptor;
  };
}

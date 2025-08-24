import type { WAFTCommandInteraction } from "@waft/types";
import { assertTextChannel } from "@waft/utils";
import { type Interaction, MessageFlags } from "discord.js";
import signale from "signale";

type CommandHandlerOptions = { skipTextChannelAssertion?: boolean };
type TypedCommandHandler<TOpts extends CommandHandlerOptions> = (
  interaction: TOpts["skipTextChannelAssertion"] extends true
    ? Interaction
    : WAFTCommandInteraction
) => Promise<void>;

export function CommandHandler<TOpts extends CommandHandlerOptions>(
  options?: TOpts
) {
  return <T extends TypedCommandHandler<TOpts>>(
    target: T,
    context: ClassMethodDecoratorContext
  ) => {
    const name = String(context.name);
    const wrapped = async function (this: unknown, interaction: Interaction) {
      try {
        if (!interaction.isChatInputCommand()) {
          return;
        }
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        if (!options?.skipTextChannelAssertion) {
          assertTextChannel(interaction);
        }
        await target.call(this, interaction as Parameters<T>[0]);
      } catch (err) {
        signale.error(`Error in ${name}`, err);
        if (interaction.isRepliable()) {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply("❌ Something went wrong");
          } else {
            await interaction.reply({
              content: "❌ Something went wrong",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    };

    return wrapped;
  };
}

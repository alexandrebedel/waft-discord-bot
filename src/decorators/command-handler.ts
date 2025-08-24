import { type Interaction, MessageFlags } from "discord.js";

export function CommandHandler() {
  return (
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(i: Interaction) => Promise<void>>
  ) => {
    const original = descriptor.value;

    if (!original) {
      console.log("⚠️ please write a message");
      return;
    }
    descriptor.value = async function (
      interaction: Interaction
    ): Promise<void> {
      try {
        if (!interaction.isChatInputCommand()) {
          return;
        }
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        await original.call(this, interaction);
      } catch (err) {
        console.error(`❌ Error in ${String(propertyKey)}:`, err);
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
    return descriptor;
  };
}

import { SlashCommandBuilder, Routes } from "discord.js";
import {
  CLIENT_ID,
  DISCORD_TOKEN,
  discordClient,
  GUILD_ID,
  rest,
} from "./lib/discord";

discordClient.once("clientReady", (client) => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
});

discordClient.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    msg.reply("pong 🏓");
  }
});

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Réponds avec pong !"),
].map((command) => command.toJSON());

(async () => {
  try {
    console.log("🔄 Enregistrement des commandes (/ping)...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("✅ Slash command enregistrée");
  } catch (error) {
    console.error(error);
  }
})();

discordClient.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("pong 🏓");
  }
});

discordClient.login(DISCORD_TOKEN);

import { Client, GatewayIntentBits, REST } from "discord.js";
import { config } from "./config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const rest = new REST({ version: "10" }).setToken(config.discordToken);

export { client as discordClient, rest };

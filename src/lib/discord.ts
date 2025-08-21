import { Client, GatewayIntentBits, REST } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
export const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
export const GUILD_ID = process.env.DISCORD_GUILD_ID!;

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

export { client as discordClient, rest };

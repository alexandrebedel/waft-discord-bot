import { Client, GatewayIntentBits, REST } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

export const DISCORD_TOKEN = Bun.env.DISCORD_TOKEN!;
export const CLIENT_ID = Bun.env.DISCORD_CLIENT_ID!;
export const GUILD_ID = Bun.env.DISCORD_GUILD_ID!;

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

export { client as discordClient, rest };

import {
  CLIENT_ID,
  DISCORD_TOKEN,
  discordClient,
  GUILD_ID,
  rest,
} from "./lib/discord";
import './commands';

discordClient.once("clientReady", (client) => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
});

discordClient.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    msg.reply("pong 🏓");
  }
});

discordClient.login(DISCORD_TOKEN);

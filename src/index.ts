import { DISCORD_TOKEN, discordClient } from "./lib/discord";
import { buildRoutesFromModule } from "./server";
import "./commands";

discordClient.once("clientReady", (client) => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
});

discordClient.login(DISCORD_TOKEN);

Bun.serve({
  port: 3000,
  routes: buildRoutesFromModule(),
});

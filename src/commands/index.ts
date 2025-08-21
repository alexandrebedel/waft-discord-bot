import { join } from "node:path";
import type { IWAFTCommand } from "../types/commands";
import { CLIENT_ID, discordClient, GUILD_ID, rest } from "../lib/discord";
import {
  Collection,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

const glob = new Bun.Glob("src/commands/utility/*.ts");
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandInstances = new Collection<string, IWAFTCommand>();

for await (const file of glob.scan(".")) {
  const fullpath = join(process.cwd(), file);
  const module = await import(fullpath);

  if (!module.default) {
    console.warn(`⚠️ Skipped ${file} no such default export`);
    continue;
  }

  const instance = new module.default() as IWAFTCommand;
  const command = instance.command;

  if (!command.name || typeof command.toJSON !== "function") {
    console.warn(`⚠️ Skipped ${file} (no valid .command property)`);
    continue;
  }
  commands.push(command.toJSON());
  commandInstances.set(command.name, instance);
  console.log(`✅ Loaded command: ${command.name}`);
}

try {
  console.log("🔄 Deploying commands...");
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });
  console.log("🎉 OK — commands registered successfully");
} catch (err) {
  console.error("❌ Failed to deploy commands", err);
  process.exit(1);
}

discordClient.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const instance = commandInstances.get(interaction.commandName);

  if (!instance) {
    return;
  }
  instance.handler(interaction);
});

import { join } from "node:path";
import { config, discordClient, rest } from "@waft/lib";
import type { IWAFTCommand } from "@waft/types";
import {
  Collection,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import signale from "signale";

const glob = new Bun.Glob("src/commands/utility/**/*.ts");
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandInstances = new Collection<string, IWAFTCommand>();

for await (const file of glob.scan(".")) {
  const fullpath = join(process.cwd(), file);
  const module = await import(fullpath);

  if (!module.default) {
    signale.warn(`Skipped ${file} no such default export`);
    continue;
  }

  const instance = new module.default() as IWAFTCommand;
  const command = instance.command;

  if (!command.name || typeof command.toJSON !== "function") {
    signale.warn(`Skipped ${file} (no valid .command property)`);
    continue;
  }
  commands.push(command.toJSON());
  commandInstances.set(command.name, instance);
}

signale.success(
  `Loaded commands: ${commandInstances.map((v) => v.command.name).join(", ")}`
);

try {
  signale.start("Deploying commands...");
  await rest.put(
    Routes.applicationGuildCommands(
      config.discordClientId,
      config.discordGuildId
    ),
    { body: commands }
  );
  signale.success("Commands registered successfully");
} catch (err) {
  signale.error("Failed to deploy commands", err);
  process.exit(1);
}

discordClient.on("interactionCreate", async (interaction) => {
  if (interaction.isModalSubmit()) {
    const [commandKey] = interaction.customId.split(":");

    if (!commandKey) {
      return;
    }
    const instance = commandInstances.get(commandKey);

    if (instance?.modal) {
      await instance.modal(interaction);
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const instance = commandInstances.get(interaction.commandName);

    try {
      if (instance?.autocomplete) {
        await instance.autocomplete(interaction);
      } else {
        await interaction.respond([]);
      }
    } catch {
      try {
        await interaction.respond([]);
      } catch {}
    }
    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const instance = commandInstances.get(interaction.commandName);

  if (!instance) {
    return;
  }
  await instance.handler(interaction);
});

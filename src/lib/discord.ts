import { Release, Track } from "@waft/models";
import { renderTracklistLines } from "@waft/utils/discord";
import { Client, GatewayIntentBits, REST } from "discord.js";
import { config } from "./config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const rest = new REST({ version: "10" }).setToken(config.discordToken);


export async function updateReleaseMessage(releaseId: string) {
  const release = await Release.findOne({ _id: releaseId })
    .select("catalog title discordChannelId discordMessageId")
    .lean();

  release?.planningMessageId;

  if (!release?.channelId || !release?.planningMessageId) {
    return;
  }

  const tracks = await Track.find({ releaseId })
    .select("index artist title driveWebViewLink")
    .lean();

  const tracklist = renderTracklistLines(tracks as any);
  const header = `🎵 **${release.catalog}** — ${release.title ?? ""}`.trim();
  const body = tracklist.length ? tracklist : "_Tracklist en cours…_";
  const content = `${header}\n\n${body}`;
  const channel = await client.channels.fetch(release.channelId);

  if (!channel?.isTextBased()) {
    return;
  }
  const msg = await channel.messages.fetch(release.planningMessageId);

  await msg.edit({ content });
}

export { client as discordClient, rest };

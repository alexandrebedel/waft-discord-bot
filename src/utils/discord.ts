import {
  DISCORD_CHANNELS,
  type DiscordChannels,
  SHORT_MONTHS,
  SHORT_WEEKDAYS,
} from "@waft/constants";
import type { Premiere } from "@waft/models";
import type {
  APIEmbed,
  APIEmbedAuthor,
  APIEmbedField,
  Message,
  MessageCreateOptions,
  MessagePayload,
  TextChannel,
} from "discord.js";
import { discordClient } from "../lib/discord";
import { capitalize, pad } from ".";
import { driveDirectImageUrl } from "./google";

export async function fetchUserToEmberAuthor(
  userId: string
): Promise<APIEmbedAuthor> {
  try {
    const user = await discordClient.users.fetch(userId);

    return { name: user.displayName, icon_url: user.avatarURL() as string };
  } catch {
    return { name: "Inconnu" };
  }
}

export async function sendMessageToChannel(
  id: string,
  content: string | MessagePayload | MessageCreateOptions
) {
  const channel = await discordClient.channels.fetch(id);

  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or is not text-based");
  }
  return await (channel as TextChannel).send(content);
}

export function sendMessageTo(
  channel: DiscordChannels,
  content: string | MessagePayload | MessageCreateOptions
) {
  return sendMessageToChannel(DISCORD_CHANNELS[channel], content);
}

export async function startReleaseThread(message: Message, catalog: string) {
  try {
    const thread = await message.startThread({
      name: `${catalog} — discussion`.slice(0, 100),
      autoArchiveDuration: 10080, // 7 days
    });

    return thread.id;
  } catch {
    return null;
  }
}

function fmtDate(d: Date | string, includeTime = false) {
  const x = typeof d === "string" ? new Date(d) : d;
  let base = `${SHORT_WEEKDAYS[x.getDay()]} ${String(x.getDate()).padStart(
    2,
    "0"
  )} ${SHORT_MONTHS[x.getMonth()]}`;

  if (includeTime) {
    base += ` ${pad(x.getHours(), 2)}:${pad(x.getMinutes(), 2)}`;
  }
  return `${base} (Europe/Paris)`;
}

export function renderReleaseMessage(opts: {
  catalog: string;
  title: string;
  driveUrl: string;
  tracks: Array<{
    index: number;
    artist: string;
    title: string;
    status: "premaster" | "master";
    releaseDate?: Date | null;
    driveWebViewLink?: string | null;
  }>;
}) {
  const { catalog, title, driveUrl, tracks } = opts;
  const planning = renderPlanningTrack(tracks);
  const tracklist = renderTracklist(tracks);

  return [
    `# ✨ **${catalog} — ${title} — Planning** ✨`,
    "",
    "Calendrier des sorties",
    "Merci d'updater l'état de vos tracks (fichier master, pochette, etc.) pour que tout roule 👌",
    "",
    `📂 [Dossier Google Drive](${driveUrl})`,
    "## 📅 **Planning**",
    planning,
    "## ✅ **Tracklist**",
    tracklist,
  ].join("\n");
}

export async function renderPremiereMessage(premiere: Premiere) {
  const when = capitalize(fmtDate(premiere.scheduledAt, true));
  const fields: APIEmbedField[] = [
    { name: "🗓️ Date", value: when },
    {
      name: "🎵 Audio",
      value: `[fichier](${premiere.audioUrl})`,
      inline: true,
    },
    {
      name: "🖼️ Artwork",
      value: `[fichier](${premiere.artworkUrl})`,
      inline: true,
    },
    { name: "\u200B", value: "" },
    {
      name: "🌐 SoundCloud public",
      value: premiere.scPublicUrl
        ? `[lien](${premiere.scPublicUrl})`
        : "_à venir_",
      inline: true,
    },
    {
      name: "🔒 SoundCloud privé",
      value: premiere.scPrivateLink
        ? `[lien](${premiere.scPrivateLink})`
        : "_à venir_",
      inline: true,
    },
  ];
  const embed: APIEmbed = {
    title: `Première — ${premiere.title}`,
    description: premiere.description,
    author: await fetchUserToEmberAuthor(premiere.discordUserId),
    color: 0xff7a00,
    fields,
    footer: { text: "Europe/Paris" },
    image: { url: driveDirectImageUrl(premiere.artworkUrl) },
    timestamp: new Date(premiere.scheduledAt).toISOString(),
  };

  return { embeds: [embed] };
}

// TODO: type
function renderPlanningTrack(tracks: any[]) {
  const sorted = tracks.sort((a, b) => a.index - b.index);

  if (sorted.length === 0) {
    return "_Aucune date renseignée pour l'instant._";
  }
  return sorted
    .map((t, i) => {
      const dateStr = t.releaseDate ? fmtDate(t.releaseDate) : "Date à définir";
      const n = `${i + 1}\\.`;

      return `**${n} ${capitalize(dateStr)}**: ${t.artist} — *${t.title}*`;
    })
    .join("\n");
}

// TDOO: type
function renderTracklist(tracks: any[]) {
  if (tracks.length === 0) {
    return "_Aucune track pour l'instant._";
  }

  return tracks
    .sort((a, b) => a.index - b.index)
    .map((t) => {
      const header = `### ${t.artist} — _${t.title}_${
        t.releaseDate ? ` (${capitalize(fmtDate(t.releaseDate))})` : ""
      }`;
      const file =
        t.status === "master"
          ? `📁 Fichier master : ${
              t.driveWebViewLink ? `[fichier](${t.driveWebViewLink})` : "✅"
            }`
          : `📁 Fichier master : ❌`;
      const cover = `🖼️ Pochette : [drive](#)`;
      const desc = `🛠️ Description : ${
        t.status === "master" ? "🟡 à compléter" : "❌"
      }`;
      const sc = `🔗 Lien SC : [public](#) · [private](#)`;

      return `${header}\n${file}\n${cover}\n${desc}\n${sc}`;
    })
    .join("\n\n---\n");
}

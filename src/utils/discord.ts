import { SHORT_MONTHS, SHORT_WEEKDAYS } from "@waft/constants";
import { config } from "@waft/lib";
import type {
  Message,
  MessageCreateOptions,
  MessagePayload,
  TextChannel,
} from "discord.js";
import signale from "signale";
import { discordClient } from "../lib/discord";
import { capitalize } from ".";

export async function sendMessageToReleaseChannel(
  content: string | MessagePayload | MessageCreateOptions
) {
  const channel = await discordClient.channels.fetch(
    config.discordReleaseChannelId
  );

  if (!channel || !channel.isTextBased()) {
    throw new Error("❌ Channel not found or is not text-based");
  }
  return await (channel as TextChannel).send(content);
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

function fmtDate(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;

  return `${SHORT_WEEKDAYS[x.getDay()]} ${String(x.getDate()).padStart(
    2,
    "0"
  )} ${SHORT_MONTHS[x.getMonth()]}`;
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
    "",
    "## 📅 **Planning**",
    planning,
    "",
    "## ✅ **Tracklist**",
    tracklist,
  ].join("\n");
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

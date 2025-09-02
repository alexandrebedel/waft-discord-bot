import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import type { LineType } from "@waft/constants";
import { config } from "@waft/lib";
import { randomUUIDv7 } from "bun";
import { google } from "googleapis";
import signale from "signale";

const auth = new google.auth.GoogleAuth({
  keyFile: join(cwd(), config.googleCredentials),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

export const drive = google.drive({ version: "v3", auth });
const folderIds = {
  mainline: config.googleMainlineFolder,
  subline: config.googleSublineFolder,
  premieres: config.googlePremieresFolder,
};

// move to db
const state = {
  pageToken: null as string | null,
  channelId: null as string | null,
  resourceId: null as string | null,
  expiration: null as number | null, // epoch ms
};

export async function getStartPageToken() {
  const { data } = await drive.changes.getStartPageToken({});

  if (!data.startPageToken) {
    throw new Error("No startPageToken returned from Google Drive API");
  }
  return data.startPageToken;
}

export async function initWatch(initialToken?: string) {
  state.pageToken = initialToken || (await getStartPageToken());
  signale.success(`[Drive] startPageToken=${state.pageToken}`);
  return state.pageToken;
}

export async function startWatch(webhookAddress: string) {
  if (!state.pageToken) {
    await initWatch();
  }

  const { data } = await drive.changes.watch({
    pageToken: state.pageToken!,
    requestBody: {
      id: randomUUIDv7(),
      type: "web_hook",
      address: webhookAddress,
    },
  });

  state.channelId = data.id ?? null;
  state.resourceId = data.resourceId ?? null;
  state.expiration = data.expiration ? Number(data.expiration) : null;

  signale.success("[Drive] watch started", {
    channelId: state.channelId,
    resourceId: state.resourceId,
    expiration: state.expiration
      ? new Date(state.expiration).toISOString()
      : null,
  });

  return { ...state };
}

export async function stopWatch() {
  if (!state.channelId || !state.resourceId) return;
  try {
    await drive.channels.stop({
      requestBody: { id: state.channelId, resourceId: state.resourceId },
    });
    signale.info("[Drive] watch stopped");
  } catch (e) {
    signale.warn("[Drive] stop failed", e);
  } finally {
    state.channelId = null;
    state.resourceId = null;
    state.expiration = null;
  }
}

export async function syncChanges() {
  const all: any[] = [];
  let pageToken = state.pageToken!;
  let nextPageToken: string | undefined;
  let newStartPageToken: string | undefined;

  do {
    const { data } = await drive.changes.list({
      pageToken,
      fields:
        "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,parents,trashed,trashedTime,modifiedTime))",
      pageSize: 1000,
      includeRemoved: true,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      restrictToMyDrive: false,
    });

    signale.log(data);

    if (data.changes?.length) all.push(...data.changes);
    nextPageToken = data.nextPageToken ?? undefined;
    newStartPageToken = data.newStartPageToken ?? undefined;

    pageToken = nextPageToken || newStartPageToken || pageToken;
  } while (nextPageToken);

  // update token pour la prochaine fois
  state.pageToken = newStartPageToken || pageToken;

  return { pageToken: state.pageToken, changes: all };
}

export async function listFiles(line: "mainline" | "subline" | "premieres") {
  const res = await drive.files.list({
    q: `'${folderIds[line]}' in parents`,
    fields: "files(id, name, mimeType, createdTime, modifiedTime)",
  });

  return res.data.files;
}

export async function createReleaseFolder(name: string, lineType: LineType) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [folderIds[lineType]],
    },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return res.data;
}

export async function downloadDriveFileToTmp(fileId: string) {
  const meta = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size",
    supportsAllDrives: true,
  });

  const name = meta.data.name ?? `drive_${fileId}`;
  const tmpPath = join(tmpdir(), name);
  const dest = createWriteStream(tmpPath);
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  await new Promise<void>((resolve, reject) => {
    res.data
      .on("end", () => {
        resolve();
      })
      .on("error", (err: unknown) => {
        reject(err);
      })
      .pipe(dest);
  });

  signale.success(`[Drive] Downloaded ${name} -> ${tmpPath}`);
  return {
    path: tmpPath,
    name,
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    size: meta.data.size ? Number(meta.data.size) : undefined,
  };
}

export async function watchDrive() {
  const res = await drive.changes.watch({
    pageToken: await getStartPageToken(),
    requestBody: {
      id: randomUUIDv7(),
      type: "web_hook",
      address: "https://56d847b3ddf7.ngrok-free.app/google/changes",
    },
  });

  console.log("📡 Watch registered:", res.data);
  return res.data;
}

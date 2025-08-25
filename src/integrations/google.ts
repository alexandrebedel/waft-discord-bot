import { join } from "node:path";
import { cwd } from "node:process";
import { config } from "@waft/lib";
import { randomUUIDv7 } from "bun";
import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  keyFile: join(cwd(), config.googleCredentials),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export async function getStartPageToken() {
  const { data } = await drive.changes.getStartPageToken({});

  if (!data.startPageToken) {
    throw new Error("No startPageToken returned from Google Drive API");
  }
  return data.startPageToken;
}

export async function listFiles() {
  const res = await drive.files.list({
    q: `'${config.googleTracksFolder}' in parents`,
    fields: "files(id, name, mimeType, createdTime, modifiedTime)",
  });

  return res.data.files;
}

export async function createReleaseFolder(name: string) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [config.googleTracksFolder],
    },
    fields: "id, name, webViewLink",
  });

  return res.data;
}

export async function watchDrive() {
  const res = await drive.changes.watch({
    pageToken: await getStartPageToken(),
    requestBody: {
      id: randomUUIDv7(),
      type: "web_hook",
      address: "https://ton-domaine.com/google/changes",
    },
  });

  console.log("📡 Watch registered:", res.data);
  return res.data;
}

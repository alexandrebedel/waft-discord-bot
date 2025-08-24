import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { google } from "googleapis";

if (!Bun.env.GOOGLE_TRACKS_FOLDER || !Bun.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "Missing env variables: GOOGLE_TRACKS_FOLDER, GOOGLE_APPLICATION_CREDENTIALS"
  );
}

const tracksFolder = Bun.env.GOOGLE_TRACKS_FOLDER;

const auth = new google.auth.GoogleAuth({
  keyFile: join(cwd(), Bun.env.GOOGLE_APPLICATION_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export async function listFiles() {
  const res = await drive.files.list({
    q: `'${tracksFolder}' in parents`,
    fields: "files(id, name, mimeType, createdTime, modifiedTime)",
  });

  return res.data.files;
}

export async function createFolder(name: string) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name",
  });
  console.log("Folder created:", res.data);
}

export async function uploadFile(folderId: string) {
  const res = await drive.files.create({
    requestBody: {
      name: "track01.wav",
      parents: [folderId],
    },
    media: {
      mimeType: "audio/wav",
      body: fs.createReadStream("./track01.wav"),
    },
    fields: "id, name",
  });
  console.log("File uploaded:", res.data);
}

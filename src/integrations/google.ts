import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { config } from "@waft/lib";
import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  keyFile: join(cwd(), config.googleCredentials),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export async function listFiles() {
  const res = await drive.files.list({
    q: `'${config.googleTracksFolder}' in parents`,
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

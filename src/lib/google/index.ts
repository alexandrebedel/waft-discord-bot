import { google } from "googleapis";
import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const tracksFolder = process.env.GOOGLE_TRACKS_FOLDER!;

const auth = new google.auth.GoogleAuth({
  keyFile: join(cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS!),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export class GoogleService {
  public static async listFiles() {
    const res = await drive.files.list({
      q: `'${tracksFolder}' in parents`,
      fields: "files(id, name, mimeType, createdTime, modifiedTime)",
    });

    return res.data.files;
  }

  public static async createFolder(name: string) {
    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, name",
    });
    console.log("Folder created:", res.data);
  }

  public static async uploadFile(folderId: string) {
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
}

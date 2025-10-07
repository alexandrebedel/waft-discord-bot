import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import type { LineType } from "@waft/constants";
import { config } from "@waft/lib";
import { type drive_v3, google } from "googleapis";
import signale from "signale";

const folderIds = {
  mainline: config.googleMainlineFolder,
  subline: config.googleSublineFolder,
  premieres: config.googlePremieresFolder,
} as const;

class GoogleDrive {
  private auth = new google.auth.GoogleAuth({
    keyFile: join(cwd(), config.googleCredentials),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  public drive = google.drive({ version: "v3", auth: this.auth });

  public async listFiles(line: "mainline" | "subline" | "premieres") {
    const res = await this.drive.files.list({
      q: `'${folderIds[line]}' in parents`,
      fields: "files(id, name, mimeType, createdTime, modifiedTime)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return res.data.files;
  }

  public async createReleaseFolder(name: string, lineType: LineType) {
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [folderIds[lineType]],
      },
      fields: "id, name, parents, webViewLink",
      supportsAllDrives: true,
    });

    return res.data;
  }

  public async downloadDriveFileToTmp(fileId: string) {
    const meta = await this.drive.files.get({
      fileId,
      fields: "id,name,mimeType,size",
      supportsAllDrives: true,
    });

    const name = meta.data.name ?? `drive_${fileId}`;
    const tmpPath = join(tmpdir(), name);
    const dest = createWriteStream(tmpPath);

    const res = await this.drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    );

    await new Promise<void>((resolve, reject) => {
      res.data
        .on("end", () => resolve())
        .on("error", (err: unknown) => reject(err))
        .pipe(dest);
    });

    signale.success(`[Drive] Downloaded ${name} -> ${tmpPath}`);
    return {
      filepath: tmpPath,
      name,
      mimeType: meta.data.mimeType ?? "application/octet-stream",
      size: meta.data.size ? Number(meta.data.size) : undefined,
    };
  }

  public async deleteFilesById(ids: string | string[]) {
    const _ids = typeof ids === "string" ? [ids] : ids;

    return Promise.all(
      _ids.map((fileId) =>
        this.drive.files.delete({ fileId, supportsAllDrives: true })
      )
    );
  }

  public async getFileMeta(
    fileId: string,
    fields = "id,name,mimeType,webViewLink,parents,size,createdTime,modifiedTime"
  ) {
    const { data } = await this.drive.files.get({
      fileId,
      fields,
      supportsAllDrives: true,
    });

    return data;
  }

  public isLosslessAudio(
    meta: Pick<drive_v3.Schema$File, "mimeType" | "name">
  ) {
    const name = meta.name ?? "";

    if (meta.mimeType) {
      return [
        "audio/wav",
        "audio/x-wav",
        "audio/flac",
        "audio/x-flac",
        "audio/aiff",
        "audio/x-aiff",
      ].includes(meta.mimeType.toLowerCase());
    }
    return /\.(wav|wave|aif|aiff)$/i.test(name);
  }
}

export const gdrive = new GoogleDrive();

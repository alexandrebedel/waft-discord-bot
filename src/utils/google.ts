export function extractDriveId(
  url: string
):
  | { type: "file" | "folder"; id: string }
  | { type: "unknown"; id: undefined } {
  try {
    const u = new URL(url);
    const mFile = u.pathname.match(/\/file\/d\/(?<id>[^/]+)/);

    if (mFile?.groups?.id) {
      return { type: "file", id: mFile.groups.id };
    }

    const mFolder = u.pathname.match(/\/folders\/(?<id>[^/]+)/);
    if (mFolder?.groups?.id) {
      return { type: "folder", id: mFolder.groups.id };
    }

    const idParam = u.searchParams.get("id");
    if (idParam) {
      return { type: "file", id: idParam };
    }

    return { type: "unknown", id: undefined };
  } catch {
    return { type: "unknown", id: undefined };
  }
}

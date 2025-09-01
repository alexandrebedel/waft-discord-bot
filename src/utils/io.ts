export async function openFile(filepath: string) {
  const file = Bun.file(filepath);

  if (!file || (await file.exists()) === false) {
    throw new Error(`Audio file not found at: ${filepath}`);
  }
  return file;
}

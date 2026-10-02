export interface TxtFileResult {
  content: string;
  filename: string;
}

export async function readTxtFile(file: File): Promise<TxtFileResult> {
  if (!file.name.toLowerCase().endsWith(".txt")) {
    throw new Error("Only .txt files are supported");
  }

  const content = await file.text();
  return { content, filename: file.name };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTxtFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const name = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  downloadBlob(blob, name);
}

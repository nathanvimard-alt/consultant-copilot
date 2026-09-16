import { extractText } from "unpdf";

const PLAIN_TEXT_EXTENSIONS = [".txt", ".md"];

// Pulls raw text out of an uploaded file. A .txt file already *is* text,
// but a .pdf is a binary format describing pages/fonts/layout — we need a
// parser (unpdf, which wraps Mozilla's pdf.js) to get plain text back out.
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (PLAIN_TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return file.text();
  }

  if (name.endsWith(".pdf")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { text } = await extractText(bytes, { mergePages: true });
    return text;
  }

  throw new Error(`Unsupported file type: "${file.name}". Upload .txt, .md, or .pdf files.`);
}

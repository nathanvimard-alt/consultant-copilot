import { extractText } from "unpdf";

const PLAIN_TEXT_EXTENSIONS = [".txt", ".md"];

export interface ExtractedPage {
  // null for formats with no real concept of a "page" (.txt/.md) — the
  // whole file is treated as one page in that case.
  pageNumber: number | null;
  text: string;
}

// Pulls raw text out of an uploaded file, page by page. A .txt file
// already *is* text (and has no pages), but a .pdf is a binary format
// describing pages/fonts/layout — we need a parser (unpdf, which wraps
// Mozilla's pdf.js) to get plain text back out. Keeping pages separate
// (instead of merging them into one blob, like Day 2 did) is what lets a
// later citation say "page 2" instead of just "somewhere in this file."
export async function extractPagesFromFile(file: File): Promise<ExtractedPage[]> {
  const name = file.name.toLowerCase();

  if (PLAIN_TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return [{ pageNumber: null, text: await file.text() }];
  }

  if (name.endsWith(".pdf")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { text: pages } = await extractText(bytes, { mergePages: false });
    return pages.map((text, i) => ({ pageNumber: i + 1, text }));
  }

  throw new Error(`Unsupported file type: "${file.name}". Upload .txt, .md, or .pdf files.`);
}

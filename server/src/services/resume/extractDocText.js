import { extractPdfText } from "./pdfParser.js";
import { extractDocxText } from "./docxParser.js";
import { extractTxtText } from "./txtParser.js";

export async function extractDocumentText(buffer, fileType) {
  switch (fileType) {
    case "pdf":
      return await extractPdfText(buffer);

    case "docx":
      return await extractDocxText(buffer);

    case "txt":
      return extractTxtText(buffer);

    default:
      throw new AppError(
        "Unsupported resume file type.",
        415,
        "UNSUPPORTED_FILE_TYPE",
      );
  }
}

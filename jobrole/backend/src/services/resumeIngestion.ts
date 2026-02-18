import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const buffer = fs.readFileSync(absolutePath);

  if (mimeType === "application/pdf") {
    logger.info("Parsing PDF file...");
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    logger.info("Parsing DOCX file...");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export async function ingestResume(resumeId: string): Promise<string> {
  logger.info("Starting resume ingestion", { resumeId });

  const resume = await prisma.resume.findUniqueOrThrow({
    where: { id: resumeId },
  });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "EXTRACTING_TEXT", currentStep: 1 },
  });

  const extractedText = await extractTextFromFile(resume.filePath, resume.mimeType);

  if (!extractedText || extractedText.trim().length < 20) {
    throw new Error("Could not extract meaningful text from resume");
  }

  await prisma.resume.update({
    where: { id: resumeId },
    data: { extractedText },
  });

  logger.info("Resume text extracted successfully", {
    resumeId,
    textLength: extractedText.length,
  });

  return extractedText;
}

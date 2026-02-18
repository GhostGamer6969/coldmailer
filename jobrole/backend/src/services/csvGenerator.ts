import { stringify } from "csv-stringify/sync";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";

export interface CsvRow {
  Name: string;
  "Job Title": string;
  Company: string;
  "Company Website": string;
  "Role Hiring For": string;
  Email: string;
  "Email Confidence": string;
  "LinkedIn URL": string;
}

export async function generateCsv(resumeId: string): Promise<string> {
  logger.info("Generating CSV", { resumeId });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "GENERATING_CSV", currentStep: 7 },
  });

  const leads = await prisma.outreachLead.findMany({
    where: { resumeId },
    orderBy: [{ companyName: "asc" }, { personName: "asc" }],
  });

  if (leads.length === 0) {
    logger.warn("No leads found for CSV generation", { resumeId });
  }

  const rows: CsvRow[] = leads.map((lead) => ({
    Name: lead.personName,
    "Job Title": lead.personTitle,
    Company: lead.companyName,
    "Company Website": lead.companyWebsite || "",
    "Role Hiring For": lead.hiringForRole,
    Email: lead.email || "",
    "Email Confidence": lead.emailConfidence != null 
      ? (lead.emailConfidence * 100).toFixed(0) + "%" 
      : "",
    "LinkedIn URL": lead.linkedinUrl || "",
  }));

  const csv = stringify(rows, {
    header: true,
    columns: [
      "Name",
      "Job Title",
      "Company",
      "Company Website",
      "Role Hiring For",
      "Email",
      "Email Confidence",
      "LinkedIn URL",
    ],
  });

  logger.info("CSV generated successfully", {
    resumeId,
    rowCount: rows.length,
  });

  return csv;
}

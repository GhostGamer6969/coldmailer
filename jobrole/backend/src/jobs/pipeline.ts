import prisma from "../utils/prisma";
import { logger } from "../utils/logger";
import { ingestResume } from "../services/resumeIngestion";
import { extractSkills } from "../services/skillExtraction";
import { recommendRoles } from "../services/roleRecommendation";
import { discoverCompanies } from "../services/companyDiscovery";
import { discoverPeople } from "../services/peopleDiscovery";
import { enrichEmails } from "../services/emailEnrichment";
import { generateCsv } from "../services/csvGenerator";

export async function runPipeline(resumeId: string): Promise<void> {
  logger.info("=== Starting resume processing pipeline ===", { resumeId });

  try {
    logger.info("Pipeline Step 1/7: Extracting text from resume");
    await ingestResume(resumeId);

    logger.info("Pipeline Step 2/7: Extracting skills");
    await extractSkills(resumeId);

    logger.info("Pipeline Step 3/7: Recommending job roles");
    await recommendRoles(resumeId);

    logger.info("Pipeline Step 4/7: Discovering companies");
    await discoverCompanies(resumeId);

    logger.info("Pipeline Step 5/7: Discovering hiring contacts");
    await discoverPeople(resumeId);

    logger.info("Pipeline Step 6/7: Enriching email addresses");
    await enrichEmails(resumeId);

    logger.info("Pipeline Step 7/7: Generating CSV export");
    await generateCsv(resumeId);

    await prisma.resume.update({
      where: { id: resumeId },
      data: { status: "COMPLETED", currentStep: 7 },
    });

    logger.info("=== Pipeline completed successfully ===", { resumeId });
  } catch (err) {
    const error = err as Error;
    logger.error("Pipeline failed", { resumeId, error: error.message, stack: error.stack });

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        status: "FAILED",
        error: error.message,
      },
    });

    throw error;
  }
}

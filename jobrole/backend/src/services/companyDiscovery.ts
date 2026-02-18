import prisma from "../utils/prisma";
import { chatCompletion, parseJsonResponse } from "../utils/openai";
import { logger } from "../utils/logger";

interface CompanyResult {
  name: string;
  website: string;
  industry: string;
}

interface CompanyDiscoveryResult {
  companies: CompanyResult[];
}

const SYSTEM_PROMPT = `You are a JSON API that finds companies hiring for specific roles. You MUST respond with ONLY a JSON object — no explanation, no markdown, no extra text.

Output this exact JSON structure:
{"companies":[{"name":"Company Name","website":"https://company.com","industry":"Industry"}]}

Rules:
- Return 3-5 real companies per role
- Include a mix of large and mid-size tech companies
- Website must be the actual company URL
- Industry should be specific (e.g., "Cloud Infrastructure", "Fintech")

IMPORTANT: Return ONLY the JSON object. No other text.`;

export async function discoverCompanies(resumeId: string): Promise<void> {
  logger.info("Starting company discovery", { resumeId });

  const jobRoles = await prisma.jobRole.findMany({
    where: { resumeId },
  });

  if (jobRoles.length === 0) {
    throw new Error("No job roles found for company discovery");
  }

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "DISCOVERING_COMPANIES", currentStep: 4 },
  });

  // Clear existing companies for this resume
  await prisma.company.deleteMany({ where: { resumeId } });

  const allCompanies: Array<{ name: string; website: string; industry: string; hiringFor: string }> = [];
  const seenCompanyNames = new Set<string>();

  for (const role of jobRoles) {
    try {
      const userPrompt = `Find companies actively hiring for the role: "${role.title}"`;
      const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt);
      const result = parseJsonResponse<CompanyDiscoveryResult>(raw);

      if (result.companies && Array.isArray(result.companies)) {
        for (const company of result.companies) {
          const normalizedName = company.name.toLowerCase().trim();
          if (!seenCompanyNames.has(normalizedName)) {
            seenCompanyNames.add(normalizedName);
            allCompanies.push({
              name: company.name,
              website: company.website || "",
              industry: company.industry || "Technology",
              hiringFor: role.title,
            });
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed to discover companies for role: ${role.title}`, {
        error: (err as Error).message,
      });
    }
  }

  if (allCompanies.length === 0) {
    throw new Error("No companies discovered for any role");
  }

  await prisma.company.createMany({
    data: allCompanies.map((c) => ({
      resumeId,
      name: c.name,
      website: c.website,
      industry: c.industry,
      hiringFor: c.hiringFor,
      source: "llm_discovery",
    })),
  });

  logger.info("Companies discovered successfully", {
    resumeId,
    companyCount: allCompanies.length,
  });
}

import prisma from "../utils/prisma";
import { chatCompletion, parseJsonResponse } from "../utils/openai";
import { logger } from "../utils/logger";

interface PersonResult {
  full_name: string;
  job_title: string;
  linkedin_url: string;
}

interface PeopleDiscoveryResult {
  people: PersonResult[];
}

const SYSTEM_PROMPT = `You are a JSON API that recalls REAL publicly known hiring contacts at companies. You MUST respond with ONLY a JSON object.

Output this exact JSON structure:
{"people":[{"full_name":"Jane Smith","job_title":"Head of Talent Acquisition","linkedin_url":"https://linkedin.com/in/janesmith"}]}

CRITICAL RULES:
- Return 2-4 people per company
- Use REAL names of people you know from your training data who work or worked at this company in hiring/HR/recruiting/management roles
- These should be people whose names appeared publicly on LinkedIn, company blogs, conference talks, or press releases
- If you are not confident about specific people at this company, use the most common hiring title patterns at that company and realistic names
- Titles to focus on: VP of People, Head of Talent, Technical Recruiter, HR Director, Engineering Manager, Hiring Manager
- LinkedIn URLs should follow the pattern: https://linkedin.com/in/firstnamelastname (lowercase, no spaces)
- Do NOT use obviously fake placeholder names like "John Doe" or "Jane Smith"

IMPORTANT: Return ONLY the JSON object. No other text.`;

export async function discoverPeople(resumeId: string): Promise<void> {
  logger.info("Starting people discovery", { resumeId });

  const companies = await prisma.company.findMany({
    where: { resumeId },
  });

  if (companies.length === 0) {
    throw new Error("No companies found for people discovery");
  }

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "DISCOVERING_PEOPLE", currentStep: 5 },
  });

  // Clear existing people for this resume
  await prisma.person.deleteMany({ where: { resumeId } });

  let totalPeople = 0;

  // Process companies sequentially (local LLM handles one at a time best)
  for (const company of companies) {
    try {
      const userPrompt = `Recall real hiring/recruiting/HR contacts at: "${company.name}" (${company.industry || "Technology"} company, website: ${company.website || "N/A"}). Use names from your training data.`;

      const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt);
      const result = parseJsonResponse<PeopleDiscoveryResult>(raw);

      if (result.people && Array.isArray(result.people)) {
        const validPeople = result.people.filter(
          (p) => p.full_name && p.job_title && p.full_name.split(/\s+/).length >= 2
        );

        if (validPeople.length > 0) {
          await prisma.person.createMany({
            data: validPeople.map((p) => ({
              resumeId,
              companyId: company.id,
              fullName: p.full_name,
              jobTitle: p.job_title,
              linkedinUrl: p.linkedin_url || null,
            })),
          });
          totalPeople += validPeople.length;
          logger.info(`Found ${validPeople.length} contacts for ${company.name}`);
        }
      }
    } catch (err) {
      logger.warn(`Failed to discover people for ${company.name}: ${(err as Error).message}`);
    }
  }

  if (totalPeople === 0) {
    logger.warn("No people discovered for any company", { resumeId });
  }

  logger.info("People discovery completed", {
    resumeId,
    peopleCount: totalPeople,
  });
}

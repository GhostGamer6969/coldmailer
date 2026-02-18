import prisma from "../utils/prisma";
import { chatCompletion, parseJsonResponse } from "../utils/openai";
import { logger } from "../utils/logger";

interface RoleRecommendationResult {
  roles: string[];
}

const SYSTEM_PROMPT = `You are a JSON API that maps skills to job roles. You MUST respond with ONLY a JSON object — no explanation, no markdown, no extra text.

Output this exact JSON structure:
{"roles":["Role Title 1","Role Title 2","Role Title 3"]}

Rules:
- Suggest 3-6 realistic job titles found on LinkedIn/Indeed
- Be specific: "Senior Backend Engineer" not just "Engineer"
- Consider the experience level

IMPORTANT: Return ONLY the JSON object. No other text.`;

export async function recommendRoles(resumeId: string): Promise<string[]> {
  logger.info("Starting role recommendation", { resumeId });

  const skillProfile = await prisma.skillProfile.findUniqueOrThrow({
    where: { resumeId },
  });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "MAPPING_ROLES", currentStep: 3 },
  });

  const userPrompt = `Given this candidate profile, suggest suitable job roles:

Skills: ${skillProfile.skills.join(", ")}
Tools: ${skillProfile.tools.join(", ")}
Tech Stack: ${skillProfile.techStack.join(", ")}
Domains: ${skillProfile.domains.join(", ")}
Experience Level: ${skillProfile.experienceLevel}`;

  const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt);
  const result = parseJsonResponse<RoleRecommendationResult>(raw);

  if (!result.roles || !Array.isArray(result.roles) || result.roles.length === 0) {
    throw new Error("Invalid role recommendation result");
  }

  // Clear existing roles for this resume, then create new ones
  await prisma.jobRole.deleteMany({ where: { resumeId } });
  
  await prisma.jobRole.createMany({
    data: result.roles.map((title) => ({
      resumeId,
      title,
    })),
  });

  logger.info("Roles recommended successfully", {
    resumeId,
    roleCount: result.roles.length,
    roles: result.roles,
  });

  return result.roles;
}

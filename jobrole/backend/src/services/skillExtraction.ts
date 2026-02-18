import prisma from "../utils/prisma";
import { chatCompletion, parseJsonResponse } from "../utils/openai";
import { logger } from "../utils/logger";

interface SkillExtractionResult {
  skills: string[];
  tools: string[];
  tech_stack: string[];
  domains: string[];
  experience_level: "junior" | "mid" | "senior";
}

const SYSTEM_PROMPT = `You are a JSON API that extracts technical profiles from resumes. You MUST respond with ONLY a JSON object — no explanation, no markdown, no extra text.

Output this exact JSON structure:
{"skills":["skill1","skill2"],"tools":["tool1","tool2"],"tech_stack":["tech1","tech2"],"domains":["domain1","domain2"],"experience_level":"mid"}

Field definitions:
- skills: programming languages, frameworks, methodologies
- tools: specific software (Git, Docker, Kubernetes, Jira, Figma)
- tech_stack: technologies and platforms (AWS, PostgreSQL, React, Node.js)
- domains: areas of expertise (backend, frontend, blockchain, ML, DevOps)
- experience_level: one of "junior" (0-2 yrs), "mid" (2-5 yrs), or "senior" (5+ yrs)

IMPORTANT: Return ONLY the JSON object. No other text.`;

export async function extractSkills(resumeId: string): Promise<SkillExtractionResult> {
  logger.info("Starting skill extraction", { resumeId });

  const resume = await prisma.resume.findUniqueOrThrow({
    where: { id: resumeId },
  });

  if (!resume.extractedText) {
    throw new Error("No extracted text available for skill extraction");
  }

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "EXTRACTING_SKILLS", currentStep: 2 },
  });

  const userPrompt = `Extract the technical profile from this resume:\n\n${resume.extractedText.substring(0, 8000)}`;
  
  const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt);
  const result = parseJsonResponse<SkillExtractionResult>(raw);

  // Validate
  if (!result.skills || !Array.isArray(result.skills)) {
    throw new Error("Invalid skill extraction result: missing skills array");
  }

  // Upsert skill profile
  await prisma.skillProfile.upsert({
    where: { resumeId },
    create: {
      resumeId,
      skills: result.skills,
      tools: result.tools || [],
      techStack: result.tech_stack || [],
      domains: result.domains || [],
      experienceLevel: result.experience_level || "mid",
      rawJson: result as any,
    },
    update: {
      skills: result.skills,
      tools: result.tools || [],
      techStack: result.tech_stack || [],
      domains: result.domains || [],
      experienceLevel: result.experience_level || "mid",
      rawJson: result as any,
    },
  });

  logger.info("Skills extracted successfully", {
    resumeId,
    skillCount: result.skills.length,
    level: result.experience_level,
  });

  return result;
}

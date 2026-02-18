import prisma from "../utils/prisma";
import { logger } from "../utils/logger";

interface EmailResult {
  email: string;
  confidence: number;
}

/**
 * Infer email patterns from a person's name and company domain.
 * In production, this would integrate with services like Hunter.io, Clearbit, or Apollo.
 */
function inferEmail(fullName: string, companyWebsite: string): EmailResult | null {
  if (!companyWebsite) return null;

  try {
    let domain: string;
    try {
      const url = new URL(companyWebsite.startsWith("http") ? companyWebsite : `https://${companyWebsite}`);
      domain = url.hostname.replace(/^www\./, "");
    } catch {
      return null;
    }

    const nameParts = fullName.toLowerCase().trim().split(/\s+/);
    if (nameParts.length < 2) return null;

    const firstName = nameParts[0].replace(/[^a-z]/g, "");
    const lastName = nameParts[nameParts.length - 1].replace(/[^a-z]/g, "");

    if (!firstName || !lastName) return null;

    // Most common corporate email patterns (in order of likelihood)
    const patterns = [
      { format: `${firstName}.${lastName}@${domain}`, confidence: 0.75 },
      { format: `${firstName}${lastName}@${domain}`, confidence: 0.55 },
      { format: `${firstName[0]}${lastName}@${domain}`, confidence: 0.50 },
      { format: `${firstName}@${domain}`, confidence: 0.35 },
    ];

    // Use the most common pattern
    return {
      email: patterns[0].format,
      confidence: patterns[0].confidence,
    };
  } catch (err) {
    logger.debug("Email inference failed", { fullName, error: (err as Error).message });
    return null;
  }
}

/**
 * Try Hunter.io API if key is configured.
 */
async function hunterLookup(
  fullName: string,
  domain: string
): Promise<EmailResult | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;

  try {
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    if (data?.data?.email) {
      return {
        email: data.data.email,
        confidence: (data.data.score || 50) / 100,
      };
    }
  } catch (err) {
    logger.debug("Hunter.io lookup failed", { fullName, domain, error: (err as Error).message });
  }

  return null;
}

export async function enrichEmails(resumeId: string): Promise<void> {
  logger.info("Starting email enrichment", { resumeId });

  await prisma.resume.update({
    where: { id: resumeId },
    data: { status: "ENRICHING_EMAILS", currentStep: 6 },
  });

  const people = await prisma.person.findMany({
    where: { resumeId },
    include: { company: true },
  });

  // Clear existing outreach leads for this resume
  await prisma.outreachLead.deleteMany({ where: { resumeId } });

  const leads: Array<{
    resumeId: string;
    personName: string;
    personTitle: string;
    companyName: string;
    companyWebsite: string | null;
    hiringForRole: string;
    email: string | null;
    emailConfidence: number | null;
    linkedinUrl: string | null;
  }> = [];

  for (const person of people) {
    let emailResult: EmailResult | null = null;

    // Try Hunter.io first if available
    if (person.company.website) {
      try {
        const url = new URL(
          person.company.website.startsWith("http")
            ? person.company.website
            : `https://${person.company.website}`
        );
        const domain = url.hostname.replace(/^www\./, "");
        emailResult = await hunterLookup(person.fullName, domain);
      } catch {
        // ignore URL parse errors
      }
    }

    // Fallback to pattern inference
    if (!emailResult && person.company.website) {
      emailResult = inferEmail(person.fullName, person.company.website);
    }

    leads.push({
      resumeId,
      personName: person.fullName,
      personTitle: person.jobTitle,
      companyName: person.company.name,
      companyWebsite: person.company.website,
      hiringForRole: person.company.hiringFor,
      email: emailResult?.email || null,
      emailConfidence: emailResult?.confidence || null,
      linkedinUrl: person.linkedinUrl,
    });
  }

  if (leads.length > 0) {
    await prisma.outreachLead.createMany({ data: leads });
  }

  logger.info("Email enrichment completed", {
    resumeId,
    totalLeads: leads.length,
    withEmail: leads.filter((l) => l.email).length,
  });
}

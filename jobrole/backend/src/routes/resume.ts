import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";
import { upload } from "../middleware/upload";
import { jobQueue } from "../jobs/queue";
import { runPipeline } from "../jobs/pipeline";
import { generateCsv } from "../services/csvGenerator";

const router = Router();

// Upload a resume
router.post("/upload", upload.single("resume"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Create or get default user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: {} });
    }

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        originalName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        status: "UPLOADED",
        currentStep: 0,
      },
    });

    logger.info("Resume uploaded", {
      resumeId: resume.id,
      fileName: req.file.originalname,
      size: req.file.size,
    });

    res.status(201).json({
      id: resume.id,
      originalName: resume.originalName,
      status: resume.status,
    });
  } catch (err) {
    const error = err as Error;
    logger.error("Upload failed", { error: error.message });
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

// Start processing a resume
router.post("/:id/process", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;

    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    if (resume.status !== "UPLOADED" && resume.status !== "FAILED") {
      res.status(400).json({
        error: `Resume is already being processed (status: ${resume.status})`,
      });
      return;
    }

    // Reset state if re-processing
    await prisma.resume.update({
      where: { id },
      data: { status: "UPLOADED", currentStep: 0, error: null },
    });

    // Queue the pipeline
    const jobId = await jobQueue.add(
      `pipeline-${id}`,
      { resumeId: id },
      async (data: { resumeId: string }) => {
        await runPipeline(data.resumeId);
      },
      2
    );

    logger.info("Pipeline job queued", { resumeId: id, jobId });

    res.json({ message: "Processing started", resumeId: id, jobId });
  } catch (err) {
    const error = err as Error;
    logger.error("Process start failed", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get resume status
router.get("/:id/status", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;

    const resume = await prisma.resume.findUnique({
      where: { id },
      include: {
        skillProfile: true,
        jobRoles: true,
        _count: {
          select: {
            companies: true,
            people: true,
            outreachLeads: true,
          },
        },
      },
    });

    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    res.json({
      id: resume.id,
      originalName: resume.originalName,
      status: resume.status,
      currentStep: resume.currentStep,
      error: resume.error,
      skillProfile: resume.skillProfile
        ? {
            skills: resume.skillProfile.skills,
            tools: resume.skillProfile.tools,
            techStack: resume.skillProfile.techStack,
            domains: resume.skillProfile.domains,
            experienceLevel: resume.skillProfile.experienceLevel,
          }
        : null,
      jobRoles: resume.jobRoles.map((r) => r.title),
      counts: {
        companies: resume._count.companies,
        people: resume._count.people,
        leads: resume._count.outreachLeads,
      },
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Download CSV
router.get("/:id/csv", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;

    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    if (resume.status !== "COMPLETED") {
      res.status(400).json({
        error: `Resume processing not complete (status: ${resume.status})`,
      });
      return;
    }

    const csv = await generateCsv(id);

    const filename = `outreach-leads-${resume.originalName.replace(/\.[^.]+$/, "")}-${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// List all resumes
router.get("/", async (_req: Request, res: Response) => {
  try {
    const resumes = await prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        status: true,
        currentStep: true,
        createdAt: true,
        error: true,
      },
    });

    res.json(resumes);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;

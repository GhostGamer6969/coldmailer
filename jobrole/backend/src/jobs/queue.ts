import { logger } from "../utils/logger";

interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  handler: (data: T) => Promise<void>;
  retries: number;
  maxRetries: number;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

class SimpleQueue {
  private jobs: Job[] = [];
  private processing = false;
  private concurrency = 1;

  async add<T>(
    name: string,
    data: T,
    handler: (data: T) => Promise<void>,
    maxRetries = 1
  ): Promise<string> {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.jobs.push({
      id,
      name,
      data,
      handler: handler as (data: unknown) => Promise<void>,
      retries: 0,
      maxRetries,
      status: "pending",
    });

    logger.info(`Job queued: ${name}`, { jobId: id });
    this.processNext();
    
    return id;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;

    const job = this.jobs.find((j) => j.status === "pending");
    if (!job) return;

    this.processing = true;
    job.status = "running";

    try {
      logger.info(`Processing job: ${job.name}`, { jobId: job.id });
      await job.handler(job.data);
      job.status = "completed";
      logger.info(`Job completed: ${job.name}`, { jobId: job.id });
    } catch (err) {
      const error = err as Error;
      job.retries++;
      
      if (job.retries < job.maxRetries) {
        job.status = "pending";
        logger.warn(`Job failed, retrying: ${job.name}`, {
          jobId: job.id,
          attempt: job.retries,
          error: error.message,
        });
      } else {
        job.status = "failed";
        job.error = error.message;
        logger.error(`Job failed permanently: ${job.name}`, {
          jobId: job.id,
          error: error.message,
        });
      }
    } finally {
      this.processing = false;
      // Process next job
      setImmediate(() => this.processNext());
    }
  }

  getJob(id: string): Job | undefined {
    return this.jobs.find((j) => j.id === id);
  }
}

export const jobQueue = new SimpleQueue();

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  
  switch (level) {
    case "error":
      console.error(`${prefix} ${message}${metaStr}`);
      break;
    case "warn":
      console.warn(`${prefix} ${message}${metaStr}`);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(`${prefix} ${message}${metaStr}`);
      }
      break;
    default:
      console.log(`${prefix} ${message}${metaStr}`);
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
};

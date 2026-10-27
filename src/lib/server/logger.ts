type LogContext = {
  requestId?: string;
  code?: string;
  message?: string;
  model?: string;
  status?: number;
  stage?: string;
};

function writeLog(level: "info" | "error", event: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
    return;
  }

  console.info(output);
}

export const logger = {
  info(event: string, context?: LogContext) {
    writeLog("info", event, context);
  },
  error(event: string, context?: LogContext) {
    writeLog("error", event, context);
  },
};

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const COLORS: Record<LogLevel, string> = {
  INFO: '\x1b[36m',   // Cyan
  WARN: '\x1b[33m',   // Yellow
  ERROR: '\x1b[31m',  // Red
  DEBUG: '\x1b[90m',  // Gray
};
const RESET = '\x1b[0m';

function formatLog(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `${COLORS[level]}[${level}]${RESET} ${timestamp} ${COLORS[level]}[${context}]${RESET} ${message}`;
}

export const logger = {
  info(context: string, message: string): void {
    console.log(formatLog('INFO', context, message));
  },
  warn(context: string, message: string): void {
    console.warn(formatLog('WARN', context, message));
  },
  error(context: string, message: string, meta?: unknown): void {
    console.error(formatLog('ERROR', context, message));
    if (meta) console.error(meta);
  },
  debug(context: string, message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('DEBUG', context, message));
    }
  },
};

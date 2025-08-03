import winston from 'winston';
import path from 'path';

// Custom log format that excludes sensitive information
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // Remove sensitive data from logs
    const sanitizedMeta = sanitizeLogData(meta);
    
    const logEntry: any = {
      timestamp,
      level,
      message,
      ...sanitizedMeta
    };
    
    if (stack) {
      logEntry.stack = stack;
    }
    
    return JSON.stringify(logEntry);
  })
);

// Function to remove sensitive information from log data
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'cookie', 'session', 'email', 'phone', 'ssn', 'creditCard'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ai-menu-generator' },
  transports: [
    // Write all logs to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error'
    }),
    
    // Write all logs to combined file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log')
    })
  ]
});

// Add file transports only in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'app.log'),
    level: 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

export default logger;
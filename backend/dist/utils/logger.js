"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const sanitizedMeta = sanitizeLogData(meta);
    const logEntry = {
        timestamp,
        level,
        message,
        ...sanitizedMeta
    };
    if (stack) {
        logEntry.stack = stack;
    }
    return JSON.stringify(logEntry);
}));
function sanitizeLogData(data) {
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
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeLogData(sanitized[key]);
        }
    }
    return sanitized;
}
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'ai-menu-generator' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(process.cwd(), 'logs', 'error.log'),
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(process.cwd(), 'logs', 'combined.log')
        })
    ]
});
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'app.log'),
        level: 'info',
        maxsize: 5242880,
        maxFiles: 5
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map
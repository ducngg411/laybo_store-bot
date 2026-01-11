import pino from 'pino';
import { config } from './config';

export const logger = pino({
    level: config.app.nodeEnv === 'production' ? 'info' : 'debug',
    transport:
        config.app.nodeEnv === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    ignore: 'pid,hostname',
                    translateTime: 'HH:MM:ss',
                },
            }
            : undefined,
});

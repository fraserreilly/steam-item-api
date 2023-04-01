import { createLogger, format, transports } from 'winston';

export const log = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'steam-card-bot' },
  transports: [
    //new transports.File({ filename: 'error.log', level: 'error' }),
    //new transports.File({ filename: 'combined.log' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

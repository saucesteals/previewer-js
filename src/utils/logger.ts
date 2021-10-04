import { createLogger, format, Logger, transports } from "winston";
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

export const makeLogger = (name: string): Logger => {
  return createLogger({
    format: combine(label({ label: name }), timestamp(), myFormat),
    transports: [new transports.Console()],
  });
};

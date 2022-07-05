import winston from "winston";
import { ENVIRONMENT } from "../config/default";

console.log("123")
const env = ENVIRONMENT as string;
console.log(env)
const level = env === "production" ? "error" : "debug";
const options: winston.LoggerOptions = {
    transports: [
        new winston.transports.Console({
            level: level,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            )

        }),
        new winston.transports.File({ filename: "debug.log", level: "debug" })
    ]
};

winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    debug: 'green'
});
const logger = winston.createLogger(options);

if (env !== "production") {
    logger.debug("Logging initialized at debug level");
}

export default logger;
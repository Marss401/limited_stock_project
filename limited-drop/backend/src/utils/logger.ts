import winston from "winston";
 
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()  // Structured JSON logs (easy to search)
  ),
  transports: [
	new winston.transports.Console({
  	format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
  	),
	}),
  ],
});
 
export default logger;

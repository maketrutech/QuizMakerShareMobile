// logger.ts
import { logger } from "react-native-logs";

// Define custom transports (optional)
const customTransport = (msg: any) => {
  console.log(`${msg.level.text} → ${msg.msg}`);
};

const log = logger.createLogger({
  severity: "debug", // default: "debug"
  transport: customTransport, // or "console" (default)
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
});

export default log;

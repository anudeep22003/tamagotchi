import log from "@/lib/logger";
import { httpClient } from "@/lib/httpClient";

const audioLogger = log.getLogger("audio");
audioLogger.setLevel("debug");

export default audioLogger;
export { httpClient };

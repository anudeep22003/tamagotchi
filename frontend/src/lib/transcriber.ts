import { BACKEND_URL } from "@/constants";
import axios from "axios";
import { mediaLogger } from "./logger";

const axiosClient = axios.create({
  baseURL: `${BACKEND_URL}/api/transcribe`,
  withCredentials: true,
});

export interface Transcriber {
  transcribe(audio: Blob): Promise<string>;
}

export class WhisperTranscriber implements Transcriber {
  constructor() {}

  async transcribe(audio: Blob): Promise<string> {
    mediaLogger.debug("transcribing audio, payload", { audio });
    const formData = new FormData();
    formData.append("file", audio);
    const response = await axiosClient.post("/whisper", formData);
    return response.data;
  }
}

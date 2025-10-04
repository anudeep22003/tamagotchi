import { httpClient } from "./httpClient";
import { mediaLogger } from "./logger";

export interface Transcriber {
  transcribe(audio: Blob): Promise<string>;
}

export class WhisperTranscriber implements Transcriber {
  private url: string = "/api/transcribe/whisper";
  constructor() {}

  async transcribe(audio: Blob): Promise<string> {
    mediaLogger.debug("transcribing audio, payload", { audio });
    const formData = new FormData();
    formData.append("file", audio);
    try {
      const transcribedText = await httpClient.post<string>(this.url, formData);
      return transcribedText;
    } catch (error) {
      mediaLogger.error("error transcribing audio", { error });
      throw error;
    }
  }
}

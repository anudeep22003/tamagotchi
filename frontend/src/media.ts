import { mediaLogger } from "@/lib/logger";
const MIME_TYPE = "audio/webm";

export class MediaManager {
  private activeStream: MediaStream | null = null;
  private activeRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor() {}

  async getAudioStream(): Promise<MediaStream | null> {
    try {
      // Release any existing stream before creating a new one
      this.releaseActiveStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.activeStream = stream;
      return stream;
    } catch (error) {
      mediaLogger.error("Error getting audio permission", error);
      return null;
    }
  }

  async getAudioRecorder(): Promise<MediaRecorder | null> {
    const stream = await this.getAudioStream();
    if (!stream) return null;
    this.activeRecorder = new MediaRecorder(stream, {
      mimeType: MIME_TYPE,
    });
    return this.activeRecorder;
  }

  releaseActiveStream(): void {
    const stream = this.activeStream;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        mediaLogger.info("Audio track stopped", { track: track.kind });
      });
      this.activeStream = null;
    }
  }

  async startRecording(): Promise<void> {
    mediaLogger.debug("start recording clicked, current config", {
      stream: this.activeStream,
      recorder: this.activeRecorder,
    });
    const stream = await this.getAudioStream();
    if (!stream) throw new Error("Failed to get audio stream");
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME_TYPE,
    });
    this.activeRecorder = recorder;
    mediaLogger.debug("attaching event listeners");
    recorder.onstart = () => {
      mediaLogger.debug("start event fired");
    };
    recorder.onstop = () => {
      mediaLogger.debug("stop event fired");
    };
    recorder.onerror = (event) => {
      mediaLogger.error("error event fired", { event });
    };
    recorder.ondataavailable = (event) => {
      mediaLogger.debug("data available event fired", { event });
    };
    mediaLogger.debug("starting the recorder, current config", {
      stream: this.activeStream,
      recorder: this.activeRecorder,
    });
    recorder.start();
    mediaLogger.debug("started the recorder");
  }

  stopRecording(): void {
    mediaLogger.debug("stop recording clicked, current config", {
      recorder: this.activeRecorder,
      stream: this.activeStream,
    });
    if (!this.activeRecorder) throw new Error("No active recorder");
    this.activeRecorder.stop();
    this.activeRecorder = null;
    this.releaseActiveStream();
    mediaLogger.debug("stopped the recorder, released the active stream, current config", {
      recorder: this.activeRecorder,
      stream: this.activeStream,
    });
  }

  getBlob(): Blob {
    mediaLogger.debug("get blob length: ", this.chunks.length);
    return new Blob(this.chunks, { type: MIME_TYPE });
  }
}

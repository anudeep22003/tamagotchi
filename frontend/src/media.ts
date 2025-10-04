import { mediaLogger } from "@/lib/logger";
import type { Transcriber } from "./lib/transcriber";
import Analyzer from "./analyzer";
const MIME_TYPE = "audio/webm";

export class MediaManager {
  private activeStream: MediaStream | null = null;
  private activeRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private transcriber: Transcriber;
  private analyzer: Analyzer;

  constructor(transcriber: Transcriber) {
    this.transcriber = transcriber;
    this.analyzer = new Analyzer();
  }

  async transcribe(): Promise<string> {
    mediaLogger.info("transcribing audio, chunks length", {
      chunks: this.chunks.length,
    });
    const blob = this.getBlob();
    const text = await this.transcriber.transcribe(blob);
    mediaLogger.debug("transcribed text", { text });
    return text;
  }

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
    mediaLogger.info("start recording clicked, current config", {
      stream: this.activeStream,
      recorder: this.activeRecorder,
      chunks: this.chunks.length,
      analyzer: this.analyzer,
    });
    this.chunks = [];
    const stream = await this.getAudioStream();
    if (!stream) throw new Error("Failed to get audio stream");
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME_TYPE,
    });
    this.activeRecorder = recorder;
    await this.analyzer.init();
    this.analyzer.connectToStream(stream);
    mediaLogger.debug("attaching event listeners");
    recorder.onstart = () => {
      mediaLogger.debug("start event fired");
    };

    // Event handlers
    recorder.onstop = () => {};
    recorder.onerror = (event) => {
      mediaLogger.error("error event fired", { event });
      throw new Error("error event fired");
    };
    recorder.ondataavailable = (event) => {
      this.chunks.push(event.data);
      mediaLogger.debug("data available event fired", {
        chunkSize: this.chunks.length,
      });
      const buffer = this.analyzer.getTimeDomainData();
      mediaLogger.debug("time domain data retrieved", {
        buffer: buffer,
      });
    };

    mediaLogger.info("starting recording, current config", {
      stream: this.activeStream,
      recorder: this.activeRecorder,
      chunks: this.chunks.length,
      analyzer: this.analyzer,
    });
    recorder.start(100);
    mediaLogger.debug("started recording");
  }

  async stopRecording(): Promise<string> {
    mediaLogger.debug("stop recording clicked");
    mediaLogger.info("stop recording clicked, current config", {
      recorder: this.activeRecorder,
      stream: this.activeStream,
      analyzer: this.analyzer,
    });
    if (!this.activeRecorder) throw new Error("No active recorder");
    this.activeRecorder.stop();
    this.activeRecorder = null;
    this.releaseActiveStream();
    mediaLogger.info(
      "stopped the recorder, released the active stream, current config",
      {
        recorder: this.activeRecorder,
        stream: this.activeStream,
        analyzer: this.analyzer,
      }
    );
    return await this.transcribe();
  }

  getBlob(): Blob {
    mediaLogger.debug("get blob length: ", this.chunks.length);
    return new Blob(this.chunks, { type: MIME_TYPE });
  }
}

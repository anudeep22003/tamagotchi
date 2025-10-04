import { mediaLogger } from "@/lib/logger";
import type { Transcriber } from "./lib/transcriber";
import Analyzer from "./analyzer";

const MIME_TYPE = "audio/webm";

// Result types for better error handling
type AudioStreamResult =
  | { success: true; stream: MediaStream }
  | { success: false; error: string; code?: string };

type RecordingResult =
  | { success: true }
  | { success: false; error: string };

type TranscriptionResult =
  | { success: true; text: string }
  | { success: false; error: string };

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

  /**
   * Register a callback to receive real-time audio visualization data
   */
  setVisualizationCallback(
    callback: (data: Float32Array) => void
  ): void {
    this.analyzer.setDataCallback(callback);
  }

  /**
   * Get audio stream with proper error handling
   */
  async getAudioStream(): Promise<AudioStreamResult> {
    try {
      this.releaseActiveStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.activeStream = stream;
      return { success: true, stream };
    } catch (error) {
      mediaLogger.error("Error getting audio permission", error);
      return {
        success: false,
        error: this.getUserFriendlyErrorMessage(error),
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Initialize the audio analyzer
   */
  async initializeAnalyzer(
    stream: MediaStream
  ): Promise<RecordingResult> {
    try {
      const initResult = await this.analyzer.init();
      if (!initResult.success) {
        return { success: false, error: initResult.error };
      }

      const connectResult = this.analyzer.connectToStream(stream);
      if (!connectResult.success) {
        return { success: false, error: connectResult.error };
      }

      const visualizationResult = this.analyzer.startVisualization();
      if (!visualizationResult.success) {
        return { success: false, error: visualizationResult.error };
      }

      return { success: true };
    } catch (error) {
      mediaLogger.error("Error initializing analyzer", error);
      return {
        success: false,
        error: "Failed to initialize audio analyzer",
      };
    }
  }

  /**
   * Create and configure a MediaRecorder
   */
  createRecorder(stream: MediaStream): MediaRecorder {
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME_TYPE,
    });

    this.activeRecorder = recorder;
    this.setupRecorderEventHandlers(recorder);
    return recorder;
  }

  /**
   * Set up event handlers for the recorder
   */
  private setupRecorderEventHandlers(recorder: MediaRecorder): void {
    recorder.onstart = () => {
      mediaLogger.debug("Recording started");
    };

    recorder.onstop = () => {
      mediaLogger.debug("Recording stopped");
    };

    recorder.onerror = (event) => {
      mediaLogger.error("Recording error", { event });
    };

    recorder.ondataavailable = (event) => {
      this.chunks.push(event.data);
      mediaLogger.debug("Data available", {
        chunkSize: this.chunks.length,
      });
    };
  }

  /**
   * Start recording - now much simpler and focused
   */
  async startRecording(): Promise<RecordingResult> {
    try {
      mediaLogger.info("Starting recording");

      // Step 1: Get audio stream
      const streamResult = await this.getAudioStream();
      if (!streamResult.success) {
        return { success: false, error: streamResult.error };
      }

      // Step 2: Initialize analyzer
      const analyzerResult = await this.initializeAnalyzer(
        streamResult.stream
      );
      if (!analyzerResult.success) {
        this.releaseActiveStream();
        return { success: false, error: analyzerResult.error };
      }

      // Step 3: Create and start recorder
      this.chunks = [];
      const recorder = this.createRecorder(streamResult.stream);
      recorder.start(100);

      mediaLogger.info("Recording started successfully");
      return { success: true };
    } catch (error) {
      mediaLogger.error(
        "Unexpected error during recording start",
        error
      );
      this.cleanup();
      return {
        success: false,
        error: "An unexpected error occurred while starting recording",
      };
    }
  }

  /**
   * Stop recording and return transcription
   */
  async stopRecording(): Promise<TranscriptionResult> {
    try {
      if (!this.activeRecorder) {
        return { success: false, error: "No active recording to stop" };
      }

      mediaLogger.info("Stopping recording");

      // Stop visualization
      this.analyzer.stopVisualization();

      // Stop recording
      this.activeRecorder.stop();
      this.activeRecorder = null;

      // Clean up stream
      this.releaseActiveStream();

      // Transcribe the audio
      const transcriptionResult = await this.transcribe();
      if (!transcriptionResult.success) {
        return transcriptionResult;
      }

      mediaLogger.info(
        "Recording stopped and transcribed successfully"
      );
      return { success: true, text: transcriptionResult.text };
    } catch (error) {
      mediaLogger.error("Error stopping recording", error);
      this.cleanup();
      return {
        success: false,
        error: "An unexpected error occurred while stopping recording",
      };
    }
  }

  /**
   * Transcribe the recorded audio
   */
  private async transcribe(): Promise<TranscriptionResult> {
    try {
      if (this.chunks.length === 0) {
        return { success: false, error: "No audio data to transcribe" };
      }

      mediaLogger.info("Transcribing audio", {
        chunks: this.chunks.length,
      });

      const blob = this.getBlob();
      const text = await this.transcriber.transcribe(blob);

      mediaLogger.debug("Transcription completed", { text });
      return { success: true, text };
    } catch (error) {
      mediaLogger.error("Error transcribing audio", error);
      return {
        success: false,
        error: "Failed to transcribe audio",
      };
    }
  }

  /**
   * Get user-friendly error messages
   */
  private getUserFriendlyErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      switch (error.name) {
        case "NotAllowedError":
          return "Microphone access denied. Please allow microphone access and try again.";
        case "NotFoundError":
          return "No microphone found. Please connect a microphone and try again.";
        case "NotReadableError":
          return "Microphone is being used by another application. Please close other apps and try again.";
        case "OverconstrainedError":
          return "Microphone settings are not supported. Please try again.";
        default:
          return "Unable to access microphone. Please check your device settings.";
      }
    }
    return "An unexpected error occurred while accessing the microphone.";
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    this.analyzer.stopVisualization();
    this.releaseActiveStream();
    this.activeRecorder = null;
    this.chunks = [];
  }

  /**
   * Release the active audio stream
   */
  releaseActiveStream(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        track.stop();
        mediaLogger.info("Audio track stopped", { track: track.kind });
      });
      this.activeStream = null;
    }
  }

  /**
   * Get the recorded audio as a blob
   */
  private getBlob(): Blob {
    mediaLogger.debug("Creating blob", { chunks: this.chunks.length });
    return new Blob(this.chunks, { type: MIME_TYPE });
  }
}

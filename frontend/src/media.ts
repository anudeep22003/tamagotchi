const MIME_TYPE = "audio/webm";

export class MediaManager {
    private activeStream: MediaStream | null = null;
  private activeRecorder: MediaRecorder | null = null;

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
      console.error("Error getting audio permission:", error);
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
        console.log("Audio track stopped:", track.kind);
      });
    }
  }

  // Keep the old method for backward compatibility, but make it use the new method
  releaseAudioStream(): void {
    this.releaseActiveStream();
    if (this.activeRecorder) {
      this.activeRecorder.stop();
      this.activeRecorder = null;
    }
  }
}

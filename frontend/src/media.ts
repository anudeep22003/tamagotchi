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
      this.activeStream = null;
    }
  }

  async startRecording(): Promise<void> {
    console.log("start recording");
    console.log("getting the stream");
    const stream = await this.getAudioStream();
    if (!stream) throw new Error("Failed to get audio stream");
    console.log("got the stream");
    console.log("creating the recorder");
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME_TYPE,
    });
    console.log("created the recorder");
    this.activeRecorder = recorder;
    console.log("attaching event listeners");
    recorder.onstart = () => {
      console.log("start event fired");
    };
    recorder.onstop = () => {
      console.log("stop event fired");
    };
    recorder.onerror = (event) => {
      console.error("error event fired", event);
    };
    recorder.ondataavailable = (event) => {
      console.log("data available event fired", event);
    };
    console.log("starting the recorder");
    recorder.start();
    console.log("started the recorder");
  }

  stopRecording(): void {
    console.log("stop recording");
    if (!this.activeRecorder) throw new Error("No active recorder");
    console.log("stopping the recorder");
    this.activeRecorder.stop();
    this.activeRecorder = null;
    console.log("releasing the active stream");
    this.releaseActiveStream();
    console.log("released the active stream");
    console.log("stopped the recorder");
  }

  getBlob(): Blob {
    console.log("get blob length: ", this.chunks.length);
    return new Blob(this.chunks, { type: MIME_TYPE });
  }
}

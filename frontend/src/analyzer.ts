import { mediaLogger } from "./lib/logger";

class Analyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {}

  async init() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      mediaLogger.debug("audio context initialized");
      // If for whatever reason due to browser or user action
      // opens in suspended state
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      mediaLogger.debug("creating analyser and configuring");
      this.analyser = this.createAnalyserAndConfigure();

      if (!this.analyser) {
        mediaLogger.error("analyser not initialized");
        throw new Error("analyser not initialized");
      }
      mediaLogger.debug("analyser initialized", {
        analyser: this.analyser,
      });
    } else if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
      if (!this.analyser) {
        mediaLogger.error("analyser not initialized");
        this.analyser = this.createAnalyserAndConfigure();
      }
    }

    this.showDetails();
  }

  createSourceNode(stream: MediaStream) {
    mediaLogger.debug("creating source node");
    if (!this.audioContext) {
      mediaLogger.error("audio context not initialized");
      throw new Error("audio context not initialized");
    }
    const source = this.audioContext.createMediaStreamSource(stream);
    mediaLogger.debug("source node created");
    return source;
  }

  connectToStream(stream: MediaStream) {
    mediaLogger.debug("connecting to stream");
    const source = this.createSourceNode(stream);
    source.connect(this.analyser!);
    mediaLogger.debug("connected to stream");
  }

  createAnalyserAndConfigure() {
    if (!this.audioContext) {
      mediaLogger.error("audio context not initialized");
      throw new Error("audio context not initialized");
    }
    const analyser = this.audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    return analyser;
  }

  getTimeDomainData() {
    if (!this.analyser) {
      mediaLogger.error("analyser not initialized");
      return null;
    }
    const buffer = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(buffer);
    return buffer;
  }

  showDetails() {
    if (!this.audioContext) {
      mediaLogger.error("audio context not initialized");
      return;
    }
    mediaLogger.debug("Analyzer context", {
      audioContext: this.audioContext,
      analyser: this.analyser,
    });
  }
}

export default Analyzer;

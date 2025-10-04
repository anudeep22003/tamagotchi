import { mediaLogger } from "./lib/logger";

class Analyzer {
  private audioContext: AudioContext | null = null;

  constructor() {}

  async init() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();

      // If for whatever reason due to browser or user action
      // opens in suspended state
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
    } else if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.showDetails();
  }

  showDetails() {
    if (!this.audioContext) {
      mediaLogger.error("audio context not initialized");
      return;
    }
    mediaLogger.debug("audio context", {
      audioContext: this.audioContext,
      sampleRate: this.audioContext.sampleRate,
      currentTime: this.audioContext.currentTime,
      state: this.audioContext.state,
      destination: this.audioContext.destination,
    });
  }
}

export default Analyzer;

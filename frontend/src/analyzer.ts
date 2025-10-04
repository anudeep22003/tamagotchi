import { mediaLogger } from "./lib/logger";

// Result types for better error handling
type AnalyzerInitResult =
  | { success: true }
  | { success: false; error: string };

type SourceNodeResult =
  | { success: true; source: MediaStreamAudioSourceNode }
  | { success: false; error: string };

type VisualizationResult =
  | { success: true }
  | { success: false; error: string };

class Analyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private onDataCallback: ((data: Float32Array) => void) | null = null;

  constructor() {}

  /**
   * Initialize the audio context and analyzer
   */
  async init(): Promise<AnalyzerInitResult> {
    try {
      if (!this.audioContext) {
        const contextResult = this.createAudioContext();
        if (!contextResult.success) {
          return contextResult;
        }
      }

      const resumeResult = await this.resumeAudioContext();
      if (!resumeResult.success) {
        return resumeResult;
      }

      const analyserResult = this.ensureAnalyserExists();
      if (!analyserResult.success) {
        return analyserResult;
      }

      this.logAnalyzerDetails();
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
   * Create a new audio context
   */
  private createAudioContext(): AnalyzerInitResult {
    try {
      this.audioContext = new AudioContext();
      mediaLogger.debug("Audio context created");
      return { success: true };
    } catch (error) {
      mediaLogger.error("Error creating audio context", error);
      return {
        success: false,
        error: "Failed to create audio context",
      };
    }
  }

  /**
   * Resume suspended audio context
   */
  private async resumeAudioContext(): Promise<AnalyzerInitResult> {
    if (!this.audioContext) {
      return { success: false, error: "Audio context not initialized" };
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        mediaLogger.debug("Audio context resumed");
      } catch (error) {
        mediaLogger.error("Error resuming audio context", error);
        return {
          success: false,
          error: "Failed to resume audio context",
        };
      }
    }

    return { success: true };
  }

  /**
   * Ensure analyser node exists and is properly configured
   */
  private ensureAnalyserExists(): AnalyzerInitResult {
    if (!this.analyser) {
      const analyserResult = this.createAnalyserAndConfigure();
      if (!analyserResult.success) {
        return analyserResult;
      }
      this.analyser = analyserResult.analyser;
    }

    return { success: true };
  }

  /**
   * Create and configure the analyser node
   */
  private createAnalyserAndConfigure():
    | { success: true; analyser: AnalyserNode }
    | { success: false; error: string } {
    if (!this.audioContext) {
      return {
        success: false,
        error: "Audio context not initialized",
      };
    }

    try {
      const analyser = this.audioContext.createAnalyser();

      // Configure analyser settings
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      mediaLogger.debug("Analyser created and configured");
      return { success: true, analyser };
    } catch (error) {
      mediaLogger.error("Error creating analyser", error);
      return {
        success: false,
        error: "Failed to create analyser node",
      };
    }
  }

  /**
   * Create a source node from a media stream
   */
  createSourceNode(stream: MediaStream): SourceNodeResult {
    if (!this.audioContext) {
      return {
        success: false,
        error: "Audio context not initialized",
      };
    }

    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      mediaLogger.debug("Source node created");
      return { success: true, source };
    } catch (error) {
      mediaLogger.error("Error creating source node", error);
      return {
        success: false,
        error: "Failed to create source node",
      };
    }
  }

  /**
   * Connect a media stream to the analyser
   */
  connectToStream(stream: MediaStream): AnalyzerInitResult {
    try {
      const sourceResult = this.createSourceNode(stream);
      if (!sourceResult.success) {
        return { success: false, error: sourceResult.error };
      }

      if (!this.analyser) {
        return {
          success: false,
          error: "Analyser not initialized",
        };
      }

      sourceResult.source.connect(this.analyser);
      mediaLogger.debug("Connected to stream");
      return { success: true };
    } catch (error) {
      mediaLogger.error("Error connecting to stream", error);
      return {
        success: false,
        error: "Failed to connect to stream",
      };
    }
  }

  /**
   * Get time domain data from the analyser
   */
  getTimeDomainData(): Float32Array | null {
    if (!this.analyser) {
      mediaLogger.warn("Analyser not initialized");
      return null;
    }

    try {
      const buffer = new Float32Array(this.analyser.frequencyBinCount);
      this.analyser.getFloatTimeDomainData(buffer);
      return buffer;
    } catch (error) {
      mediaLogger.error("Error getting time domain data", error);
      return null;
    }
  }

  /**
   * Register a callback to receive time domain data updates
   */
  setDataCallback(callback: (data: Float32Array) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Start the visualization animation loop
   */
  startVisualization(): VisualizationResult {
    if (!this.analyser) {
      return {
        success: false,
        error: "Analyser not initialized",
      };
    }

    if (this.animationFrameId !== null) {
      return {
        success: false,
        error: "Visualization already running",
      };
    }

    try {
      const animate = () => {
        const buffer = this.getTimeDomainData();
        if (buffer && this.onDataCallback) {
          this.onDataCallback(buffer);
        }
        this.animationFrameId = requestAnimationFrame(animate);
      };

      animate();
      mediaLogger.debug("Visualization started");
      return { success: true };
    } catch (error) {
      mediaLogger.error("Error starting visualization", error);
      return {
        success: false,
        error: "Failed to start visualization",
      };
    }
  }

  /**
   * Stop the visualization animation loop
   */
  stopVisualization(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      mediaLogger.debug("Visualization stopped");
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.stopVisualization();
    this.onDataCallback = null;

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    mediaLogger.debug("Analyzer cleaned up");
  }

  /**
   * Log analyzer details for debugging
   */
  private logAnalyzerDetails(): void {
    if (!this.audioContext) {
      mediaLogger.warn("Audio context not available for logging");
      return;
    }

    mediaLogger.debug("Analyzer details", {
      audioContextState: this.audioContext.state,
      analyserExists: !!this.analyser,
      analyserFftSize: this.analyser?.fftSize,
      analyserFrequencyBinCount: this.analyser?.frequencyBinCount,
    });
  }
}

export default Analyzer;

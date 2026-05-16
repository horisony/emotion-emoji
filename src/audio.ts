export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioCallback: ((base64Data: string) => void) | null = null;
  private targetSampleRate = 24000;

  async start(onAudio: (base64Data: string) => void) {
    this.onAudioCallback = onAudio;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceSampleRate = this.audioCtx.sampleRate;
    
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    const source = this.audioCtx.createMediaStreamSource(this.micStream);
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    
    // Connect to destination but with 0 gain to ensure it fires without howling
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = 0;
    source.connect(this.processor);
    this.processor.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Resample
      let resampledData: Float32Array;
      if (sourceSampleRate === this.targetSampleRate) {
        resampledData = inputData;
      } else {
        const ratio = sourceSampleRate / this.targetSampleRate;
        const newLength = Math.round(inputData.length / ratio);
        resampledData = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            resampledData[i] = inputData[Math.floor(i * ratio)];
        }
      }

      // Convert to PCM16
      const int16Array = new Int16Array(resampledData.length);
      for (let i = 0; i < resampledData.length; i++) {
        let s = Math.max(-1, Math.min(1, resampledData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      
      // Fast Base64 conversion
      const buffer = new Uint8Array(int16Array.buffer);
      let binary = '';
      // Use chunks to avoid call stack limits
      const chunkSize = 8192;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, i + chunkSize)));
      }
      const base64Audio = window.btoa(binary);

      if (this.onAudioCallback) {
        this.onAudioCallback(base64Audio);
      }
    };
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.onAudioCallback = null;
  }
}

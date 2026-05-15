export class SimplePCMPlayer {
    private static readonly SAMPLE_RATE = 24000;
    private static readonly CHANNELS = 1;
  
    private audioContext: AudioContext;
    private currentSource: AudioBufferSourceNode | null = null;
    private bufferedData: Float32Array[] = [];
    private isPlaying = false;
    private nextStartTime = 0;
  
    constructor() {
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      this.audioContext = new AudioContextConstructor();
    }
  
    appendPCM(pcmBase64: string) {
      // Decode Base64 to ArrayBuffer
      const binaryString = window.atob(pcmBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm = bytes.buffer;
  
      if (pcm.byteLength % 2 !== 0) {
        console.error('PCM data length must be a multiple of 2');
        return;
      }
  
      const int16Array = new Int16Array(pcm);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }
  
      this.bufferedData.push(float32Array);
      if (!this.isPlaying) {
        this.playNext();
      }
    }
  
    private playNext() {
      if (this.bufferedData.length === 0) {
        this.isPlaying = false;
        return;
      }
  
      this.isPlaying = true;
      const data = this.bufferedData.shift()!;
  
      const audioBuffer = this.audioContext.createBuffer(
        SimplePCMPlayer.CHANNELS,
        data.length,
        SimplePCMPlayer.SAMPLE_RATE
      );
      audioBuffer.copyToChannel(data, 0);
  
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
  
      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      this.nextStartTime = startTime + audioBuffer.duration;
  
      source.start(startTime);
      this.currentSource = source;
  
      source.onended = () => {
        this.currentSource = null;
        this.playNext();
      };
    }
  
    clearAll() {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.onended = null;
        this.currentSource = null;
      }
      this.bufferedData = [];
      this.isPlaying = false;
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

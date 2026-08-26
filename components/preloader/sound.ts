"use client";

import { Howl } from "howler";

/**
 * Web Audio API procedural sound generators converted into Howler Audio buffers.
 * Provides smooth, crisp, zero-dependency SFX for the preloader.
 */

function createAudioDataUri(frequency = 440, type: OscillatorType = "sine", duration = 0.3): string {
  if (typeof window === "undefined") return "";
  
  try {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8); // Decay envelope
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.15;
    }

    // Convert buffer to WAV Data URI
    return createWavDataUri(buffer, sampleRate);
  } catch {
    return "";
  }
}

function createWavDataUri(audioBuffer: AudioBuffer, sampleRate: number): string {
  const numChannels = 1;
  const format = 1; // PCM
  const bitDepth = 16;
  const length = audioBuffer.length * numChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, length, true);

  const data = audioBuffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

let logoSound: Howl | null = null;
let blindsSound: Howl | null = null;

export function initPreloaderSounds() {
  if (typeof window === "undefined") return;

  try {
    const logoUri = createAudioDataUri(523.25, "sine", 0.4); // C5 tone
    const blindsUri = createAudioDataUri(659.25, "triangle", 0.25); // E5 tone

    if (logoUri) {
      logoSound = new Howl({
        src: [logoUri],
        format: ["wav"],
        volume: 0.25,
        html5: false,
      });
    }

    if (blindsUri) {
      blindsSound = new Howl({
        src: [blindsUri],
        format: ["wav"],
        volume: 0.2,
        html5: false,
      });
    }
  } catch {
    // Graceful fallback if Web Audio / Howler is restricted
  }
}

export function playLogoSound() {
  try {
    if (logoSound) logoSound.play();
  } catch {
    // Silent catch if browser blocks autoplay
  }
}

export function playBlindsSound() {
  try {
    if (blindsSound) blindsSound.play();
  } catch {
    // Silent catch if browser blocks autoplay
  }
}

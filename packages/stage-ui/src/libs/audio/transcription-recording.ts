import { toPCM16FromFloat32 } from '@proj-airi/audio/encoding'

/** The official stream endpoint accepts headerless mono PCM16 at 16 kHz. */
export async function prepareOfficialTranscriptionRecording(file: Blob): Promise<File> {
  // Decoding at the endpoint rate handles device-specific WAV rates and removes
  // the container header. An offline context needs no playback device or gesture.
  const decoder = new OfflineAudioContext(1, 1, 16000)
  const audio = await decoder.decodeAudioData(await file.arrayBuffer())
  const mono = new Float32Array(audio.length)
  for (let channel = 0; channel < audio.numberOfChannels; channel++) {
    const samples = audio.getChannelData(channel)
    for (let i = 0; i < samples.length; i++)
      mono[i] += samples[i] / audio.numberOfChannels
  }
  return new File([toPCM16FromFloat32(mono)], 'recording.pcm', { type: 'application/octet-stream' })
}

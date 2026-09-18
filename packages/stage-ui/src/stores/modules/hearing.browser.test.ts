import en from '@proj-airi/i18n/locales/en'

import { toWav } from '@proj-airi/audio/encoding'
import { createPinia, disposePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'

import { useHearingStore } from './hearing'

describe('official recording transport', () => {
  // ROOT CAUSE: The recorder produces WAV at the input device sample rate,
  // but the official endpoint reads raw mono PCM16 at 16 kHz.
  it.each([16000, 48000])('normalizes a %i Hz WAV before uploading it', async (sampleRate) => {
    const pinia = createPinia()
    let hearing!: ReturnType<typeof useHearingStore>
    const app = createApp({
      setup() {
        hearing = useHearingStore()
        return () => null
      },
    })
      .use(createI18n({ legacy: false, locale: 'en', messages: { en } }))
      .use(pinia)
    app.mount(document.createElement('div'))
    try {
      const samples = new Float32Array(sampleRate * 2).fill(0.25)
      const file = new File([toWav(samples.buffer, sampleRate, 2)], 'recording.wav', { type: 'audio/wav' })
      let uploaded = new ArrayBuffer(0)
      const provider = {
        transcription: () => ({
          model: 'auto',
          baseURL: 'https://example.invalid/transcription',
          fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
            uploaded = await new Response(init?.body).arrayBuffer()
            return new Response('data: {"type":"transcript.text.delta","delta":"test"}\n\n')
          },
        }),
      }
      const input = { file }
      const result = await hearing.transcription('official-provider-transcription', provider, 'auto', input)
      expect(await result.text).toBe('test')
      expect(uploaded.byteLength).toBe(32000)
      expect(new DataView(uploaded).getInt16(16000, true)).toBeCloseTo(8191, -1)
      // Retries must decode the original recording, not a mutated raw PCM input.
      expect(input.file).toBe(file)
      const retry = await hearing.transcription('official-provider-transcription', provider, 'auto', input)
      expect(await retry.text).toBe('test')
    }
    finally {
      app.unmount()
      disposePinia(pinia)
    }
  })
})

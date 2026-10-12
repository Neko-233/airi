import { beforeEach, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { page } from 'vitest/browser'
import { defineComponent, h, ref } from 'vue'

import { provideFullscreenLayout } from './use-fullscreen-layout'

import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

beforeEach(async () => {
  localStorage.removeItem('fullscreen/surface-width')
  await page.viewport(2614, 1440)
})

// ROOT CAUSE:
// The viewport measured 2614 × 1440, but the work area measured 2560 × 1392.
// Viewport-sized layers exceeded the clipping container and moved above it.
// The layers and surface now use the host area dimensions.
it('sizes and drags the surface against the host area instead of the viewport', async () => {
  const area = ref({ width: 2560, height: 1392 })
  let layout: ReturnType<typeof provideFullscreenLayout>
  const mounted = render(defineComponent({
    setup() {
      layout = provideFullscreenLayout(area)
      return () => h('section', {
        style: { width: `${layout.surfaceWidth.value}px` },
      })
    },
  }))
  const surface = mounted.container.querySelector('section')!
  await expect.poll(() => surface.getBoundingClientRect().width).toBe(1382)
  area.value = { width: 1200, height: 900 }
  await expect.poll(() => surface.getBoundingClientRect().width).toBe(648)
  layout!.startSurfaceDrag(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500 }))
  layout!.moveSurfaceDrag(new PointerEvent('pointermove', { pointerId: 1, clientX: 400 }))
  layout!.endSurfaceDrag(new PointerEvent('pointerup', { pointerId: 1 }))
  await expect.poll(() => surface.getBoundingClientRect().width).toBe(748)
  expect(layout!.stageOffset.value).toBe(-50)
})

it('keeps inner layers at the final work area dimensions during clipping transitions', async () => {
  const clipWidth = ref(1280)
  const clipHeight = ref(696)
  const area = ref({ width: 2560, height: 1392 })
  let layout: ReturnType<typeof provideFullscreenLayout>
  const mounted = render(defineComponent({
    setup() {
      layout = provideFullscreenLayout(area)
      return () => h('div', {
        style: { position: 'relative', width: `${clipWidth.value}px`, height: `${clipHeight.value}px`, overflow: 'hidden' },
      }, [h('section', {
        style: { ...layout.areaStyle.value, position: 'absolute', left: '0', bottom: '0' },
      })])
    },
  }))
  const content = mounted.container.querySelector('section')!
  await expect.poll(() => content.getBoundingClientRect().width).toBe(2560)
  expect(content.getBoundingClientRect().height).toBe(1392)
  expect(layout!.surfaceWidth.value).toBe(1382)
  clipWidth.value = 640
  clipHeight.value = 348
  await expect.poll(() => content.parentElement!.getBoundingClientRect().width).toBe(640)
  expect(content.getBoundingClientRect().width).toBe(2560)
  expect(content.getBoundingClientRect().height).toBe(1392)
  expect(layout!.surfaceWidth.value).toBe(1382)
})

it('uses the viewport for a workspace without a separate clipping area', async () => {
  const mounted = render(defineComponent({
    setup() {
      const layout = provideFullscreenLayout()
      return () => h('section', { style: { width: `${layout.surfaceWidth.value}px` } })
    },
  }))
  const surface = mounted.container.querySelector('section')!
  await expect.poll(() => surface.getBoundingClientRect().width).toBe(1412)
})

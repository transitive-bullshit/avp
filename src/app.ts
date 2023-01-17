import * as dat from 'dat.gui'

import demo0 from '../media/audio/demo.m4a'
import coupling0 from '../media/audio/hotd-podcast-coupling-clip.m4a'
import audioUrl0 from '../media/audio/voice.m4a'
import audioUrl1 from '../media/audio/Wizard-DreamOn.mp3'
import audioUrl2 from '../media/audio/ChillyGonzales-SampleThis.mp3'
import audioUrl3 from '../media/audio/EverythingPersists-AndThenYouSeeIt.mp3'
import audioUrl4 from '../media/audio/FortMinor-WheredYouGo.mp3'

// import { CanvasAudioVisualization as AudioViz } from './CanvasAudioVisualization'
// import { HybridAudioVisualization as AudioViz } from './HybridAudioVisualization'
import {
  MeydaHybridAudioVisualization as AudioViz,
  DrawStyle,
  DrawShape,
  MeydaAudioFeature
} from './MeydaHybridAudioVisualization'

const audioTracks: { [key: string]: string } = {
  transitive_bs: demo0,
  coupling: coupling0,
  'li jin': audioUrl0,
  'dream on': audioUrl1,
  'sample this': audioUrl2,
  'and then you see it': audioUrl3,
  "where'd you go": audioUrl4
}

export interface Params {
  audioTrack: string

  offscreenScale: number
  fftSizePower: number
  bufferSizePower: number

  drawStyle: DrawStyle
  drawShape: DrawShape
  featureExtractor: MeydaAudioFeature
  smoothingFactor: number
  accentuationFactor: number
  visualScalingFactor: number
  numberOfBarkBands: number
  fill: boolean
  mirror: boolean
  bloom: boolean
  glitch: boolean

  isRecordingEnabled: boolean
  width: number
  height: number
}

let vis: AudioViz | null = null

const params: Params = {
  audioTrack: 'transitive_bs',
  featureExtractor: 'loudness' as MeydaAudioFeature,
  drawStyle: 'curves' as DrawStyle,
  drawShape: 'triangle' as DrawShape,
  offscreenScale: 2.0,
  fftSizePower: 8,
  bufferSizePower: 10,
  numberOfBarkBands: 32,
  smoothingFactor: 0.7,
  accentuationFactor: 3.0,
  visualScalingFactor: 1.0,
  fill: true,
  mirror: true,
  bloom: true,
  glitch: false,
  isRecordingEnabled: false,
  width: 480,
  height: 480
}

const gui = new dat.GUI({})
gui
  .add(params, 'audioTrack')
  .options(Object.keys(audioTracks))
  .name('audio track')
  .onFinishChange(reset)
gui
  .add(params, 'featureExtractor')
  .options([
    'loudness',
    'chroma',
    'buffer',
    'mfcc',
    'amplitudeSpectrum',
    'powerSpectrum'
  ])
  .name('feature')
  .onFinishChange(reset)
gui
  .add(params, 'drawShape')
  .options(['triangle', 'basic', 'circle', 'waveform'])
  .name('shape')
  .onChange((value) => {
    if (vis) {
      vis.drawShape = value
    }
  })
gui
  .add(params, 'drawStyle')
  .options(['curves', 'lines', 'bars'])
  .name('style')
  .onChange((value) => {
    if (vis) {
      vis.drawStyle = value
    }
  })
gui
  .add(params, 'offscreenScale', 1.0, 4.0)
  .step(1.0)
  .name('offscreen')
  .onFinishChange(reset)
gui
  .add(params, 'fftSizePower', 5, 12)
  .step(1)
  .name('fft size (log)')
  .onFinishChange(reset)
gui
  .add(params, 'bufferSizePower', 9, 12)
  .step(1)
  .name('buffer size (log)')
  .onFinishChange(reset)
gui
  .add(params, 'numberOfBarkBands', 4, 128)
  .step(1.0)
  .name('loudness bins')
  .onFinishChange(reset)
gui
  .add(params, 'smoothingFactor', 0.0, 1.0)
  .step(0.000001)
  .name('smoothing')
  .onChange((value) => {
    if (vis) {
      vis.smoothingFactor = value
    }
  })
gui
  .add(params, 'accentuationFactor', 1.0, 16.0)
  .step(0.1)
  .name('accentuation')
  .onChange((value) => {
    if (vis) {
      vis.accentuationFactor = value
    }
  })
gui
  .add(params, 'visualScalingFactor', 0.00001, 3.0)
  .step(0.1)
  .name('visual scaling')
  .onChange((value) => {
    if (vis) {
      vis.visualScalingFactor = value
    }
  })
gui
  .add(params, 'fill')
  .name('fill')
  .onChange((value) => {
    if (vis) {
      vis.fill = value
    }
  })
gui
  .add(params, 'mirror')
  .name('mirror')
  .onChange((value) => {
    if (vis) {
      vis.mirror = value
    }
  })
gui
  .add(params, 'bloom')
  .name('bloom')
  .onChange((value) => {
    if (vis) {
      vis.bloom = value
    }
  })
gui
  .add(params, 'glitch')
  .name('glitch')
  .onChange((value) => {
    if (vis) {
      vis.glitch = value
    }
  })
gui
  .add(params, 'isRecordingEnabled')
  .name('record')
  .onChange((value) => {
    if (vis) {
      if (vis.isPlaying) {
        vis.stop()
      }

      vis.isRecordingEnabled = value
    }
  })

function reset() {
  if (!vis) {
    return
  }

  restart()
}

function restart(autoplay = false) {
  let isPlaying = false
  if (vis) {
    isPlaying = vis.isPlaying

    vis.stop()
    vis = null
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  canvas.width = params.width
  canvas.height = params.height
  console.log(params)

  vis = new AudioViz({
    canvas,
    autoplay: false,
    ...params,
    mediaUrl: audioTracks[params.audioTrack],
    fftSize: 1 << params.fftSizePower,
    bufferSize: 1 << params.bufferSizePower
  })
  ;(globalThis as any).vis = vis

  if (isPlaying || autoplay) {
    vis.start()
  }
}

const play = document.getElementById('play')
play?.addEventListener('click', () => {
  if (!vis || !vis.isPlaying) {
    restart(true)
  }
})

const pause = document.getElementById('pause')
pause?.addEventListener('click', () => {
  if (vis) {
    vis.pause()
  }
})

const stop = document.getElementById('stop')
stop?.addEventListener('click', () => {
  if (vis) {
    vis.stop()
  }
})

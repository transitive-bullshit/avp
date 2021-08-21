import * as dat from 'dat.gui'

import audioUrl0 from '../audio/voice.m4a'
import audioUrl1 from '../audio/Wizard-DreamOn.mp3'
import audioUrl2 from '../audio/ChillyGonzales-SampleThis.mp3'
import audioUrl3 from '../audio/EverythingPersists-AndThenYouSeeIt.mp3'
import audioUrl4 from '../audio/FortMinor-WheredYouGo.mp3'

// import { CanvasAudioVisualization as AudioViz } from './CanvasAudioVisualization'
// import { HybridAudioVisualization as AudioViz } from './HybridAudioVisualization'
import {
  BloomFilterAudioVisualization as AudioViz,
  DrawStyle,
  DrawShape,
  MeydaAudioFeature
} from './BloomFilterAudioVisualization'

const audioTracks: { [key: string]: string } = {
  'li jin': audioUrl0,
  'dream on': audioUrl1,
  'sample this': audioUrl2,
  'and then you see it': audioUrl3,
  "where'd you go": audioUrl4
}

let vis: AudioViz | null = null

const params = {
  audioTrack: 'li jin',
  featureExtractor: 'loudness' as MeydaAudioFeature,
  drawStyle: 'curves' as DrawStyle,
  drawShape: 'triangle' as DrawShape,
  offscreenScale: 2.0,
  fftSize: 256,
  numberOfBarkBands: 32,
  smoothingFactor: 0.7,
  accentuationFactor: 3.0,
  visualScalingFactor: 1.0,
  fill: true,
  mirror: false,
  bloom: true
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
const fftC = gui.add(params, 'fftSize', 32, 4096).onFinishChange((value) => {
  if (!isPowerOf2(value)) {
    fftC.setValue(nextPowerOf2(value))
  }
  reset()
})
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
gui.add(params, 'bloom').name('bloom').onChange(reset)

function isPowerOf2(value: number): boolean {
  return (value & (value - 1)) === 0
}

function nextPowerOf2(value: number): number {
  return Math.pow(2, Math.ceil(Math.log2(value)))
}

function reset() {
  if (!vis) {
    return
  }

  restart()
}

function restart() {
  if (vis) {
    vis.stop()
    vis = null
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  canvas.width = 480
  canvas.height = 480

  vis = new AudioViz({
    canvas,
    autoplay: false,
    ...params,
    mediaUrl: audioTracks[params.audioTrack]
  })

  vis.start()
}

const play = document.getElementById('play')
play?.addEventListener('click', restart)

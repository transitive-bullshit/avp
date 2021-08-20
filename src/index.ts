import * as dat from 'dat.gui'

// import audioUrl from '../audio/Wizard-DreamOn.mp3'
// import audioUrl from '../audio/ChillyGonzales-SampleThis.mp3'
import audioUrl from '../audio/voice.m4a'
// import audioUrl from '../audio/EverythingPersists-AndThenYouSeeIt.mp3'
// import audioUrl from '../audio/FortMinor-WheredYouGo.mp3'

// import { CanvasAudioVisualization as AudioViz } from './CanvasAudioVisualization'
// import { HybridAudioVisualization as AudioViz } from './HybridAudioVisualization'
import {
  BloomFilterAudioVisualization as AudioViz,
  DrawStyle,
  DrawShape,
  MeydaAudioFeature
} from './BloomFilterAudioVisualization'

let vis: AudioViz

const params = {
  offscreenScale: 2.0,
  featureExtractor: 'loudness' as MeydaAudioFeature,
  drawStyle: 'quadratic' as DrawStyle,
  drawShape: 'triangle' as DrawShape,
  fftSize: 256,
  smoothingFactor: 0.7,
  accentuationFactor: 3.0,
  visualScalingFactor: 1.0
}

const gui = new dat.GUI({})
gui
  .add(params, 'offscreenScale', 1.0, 4.0)
  .step(1.0)
  .name('offscreen')
  .onFinishChange(restart)
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
  .onFinishChange(restart)
gui
  .add(params, 'drawShape')
  .options(['triangle', 'basic'])
  .name('shape')
  .onChange((value) => {
    vis.drawShape = value
  })
gui
  .add(params, 'drawStyle')
  .options(['quadratic', 'linear', 'discrete'])
  .name('style')
  .onChange((value) => {
    vis.drawStyle = value
  })
const fftC = gui.add(params, 'fftSize', 32, 4096).onFinishChange((value) => {
  if (!isPowerOf2(value)) {
    fftC.setValue(nextPowerOf2(value))
  }
  restart()
})
gui
  .add(params, 'smoothingFactor', 0.0, 1.0)
  .step(0.000001)
  .name('smoothing')
  .onChange((value) => {
    vis.smoothingFactor = value
  })
gui
  .add(params, 'accentuationFactor', 1.0, 16.0)
  .step(0.1)
  .name('accentuation')
  .onChange((value) => {
    vis.accentuationFactor = value
  })
gui
  .add(params, 'visualScalingFactor', 0.00001, 3.0)
  .step(0.1)
  .name('visual scaling')
  .onChange((value) => {
    vis.visualScalingFactor = value
  })

function isPowerOf2(value: number): boolean {
  return (value & (value - 1)) === 0
}

function nextPowerOf2(value: number): number {
  return Math.pow(2, Math.ceil(Math.log2(value)))
}

const play = document.getElementById('play')

function restart() {
  if (vis) {
    vis.stop()
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  canvas.width = 480
  canvas.height = 480

  vis = new AudioViz({
    canvas,
    mediaUrl: audioUrl,
    autoplay: false,
    ...params
    // offscreenScale: 2.0,
    // featureExtractor: 'loudness',
    // drawStyle: 'quadratic',
    // fftSize: 256,
    // smoothingFactor: 0.7,
    // accentuationFactor: 3.0,
    // visualScalingFactor: 1.0
  })

  vis.start()
}

play?.addEventListener('click', restart)

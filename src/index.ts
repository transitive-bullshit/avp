// import audioUrl from '../audio/Wizard-DreamOn.mp3'
// import audioUrl from '../audio/ChillyGonzales-SampleThis.mp3'
import audioUrl from '../audio/voice.m4a'
// import audioUrl from '../audio/EverythingPersists-AndThenYouSeeIt.mp3'
// import audioUrl from '../audio/FortMinor-WheredYouGo.mp3'

// import { CanvasAudioVisualization as AudioViz } from './CanvasAudioVisualization'
// import { HybridAudioVisualization as AudioViz } from './HybridAudioVisualization'
import { BloomFilterAudioVisualization as AudioViz } from './BloomFilterAudioVisualization'

const play = document.getElementById('play')
let vis: AudioViz

play?.addEventListener('click', () => {
  if (vis) {
    return
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  vis = new AudioViz({
    canvas,
    mediaUrl: audioUrl,
    autoplay: true,
    offscreenScale: 2.0,
    featureExtractor: 'loudness',
    drawStyle: 'quadratic',
    fftSize: 256,
    smoothingFactor: 0.7,
    accentuationFactor: 3.0,
    visualScalingFactor: 1.0
  })

  vis.start()
})

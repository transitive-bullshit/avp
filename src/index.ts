import audioUrl from '../audio/Wizard-DreamOn.mp3'
// import { CanvasAudioVisualization as AudioViz } from './CanvasAudioVisualization'
import { HybridAudioVisualization as AudioViz } from './HybridAudioVisualization'

const play = document.getElementById('play')
play?.addEventListener('click', () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const vis = new AudioViz({
    canvas,
    mediaUrl: audioUrl,
    autoplay: true
  })

  vis.start()
})

import audioUrl from '../audio/Wizard-DreamOn.mp3'
import { CanvasAudioVisualization } from './CanvasAudioVisualization'

const play = document.getElementById('play')
play?.addEventListener('click', () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const vis = new CanvasAudioVisualization({
    canvas,
    mediaUrl: audioUrl,
    autoplay: true
  })

  vis.start()
})

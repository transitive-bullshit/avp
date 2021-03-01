import {
  AudioVisualization,
  AudioVisualizationOptions
} from './AudioVisualization'

export class CanvasAudioVisualization extends AudioVisualization {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

  constructor(opts: AudioVisualizationOptions) {
    super(opts)

    const ctx = this.canvas.getContext('2d')
    if (ctx) {
      this.ctx = ctx
    } else {
      throw new Error('Unable to initialize canvas 2d context')
    }
  }

  protected render() {
    // TODO
    console.log('render')
  }
}

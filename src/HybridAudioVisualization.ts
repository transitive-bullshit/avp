import {
  AudioVisualization,
  AudioVisualizationOptions
} from './AudioVisualization'

interface HybridAudioVisualizationOptions extends AudioVisualizationOptions {
  offscreenCanvas?: OffscreenCanvas
}

export class HybridAudioVisualization extends AudioVisualization {
  offscreenCanvas: OffscreenCanvas
  ctx: OffscreenCanvasRenderingContext2D

  constructor(opts: HybridAudioVisualizationOptions) {
    super(opts)

    if (opts.offscreenCanvas) {
      this.offscreenCanvas = opts.offscreenCanvas
    } else {
      this.offscreenCanvas = new OffscreenCanvas(
        this.canvas.width,
        this.canvas.height
      )
    }

    const ctx = this.offscreenCanvas.getContext('2d')
    if (ctx) {
      this.ctx = ctx
    } else {
      throw new Error('Unable to initialize offscreen canvas 2d context')
    }
  }

  protected render() {
    // TODO
    console.log('render')
  }
}

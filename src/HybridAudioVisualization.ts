import {
  WebGLRenderer as ThreeWebGLRenderer,
  Scene as ThreeScene,
  Camera as ThreeCamera
} from 'three'

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

  renderer: ThreeWebGLRenderer
  scene: ThreeScene
  camera: ThreeCamera

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

    this.renderer = new ThreeWebGLRenderer({
      antialias: true,
      canvas: this.canvas
    })
    this.renderer.setSize(this.canvas.width, this.canvas.height)
    this.renderer.setClearColor(0x000000)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.scene = new ThreeScene()
    this.camera = new ThreeCamera()
  }

  _resize = () => {
    // TODO: decouple internal canvas size from the output canvas size
    const { width, height } = this.canvas
    this.offscreenCanvas.width = width
    this.offscreenCanvas.height = height
    this.renderer.setSize(width, height)
  }

  protected render() {
    this.renderer.render(this.scene, this.camera)
  }
}

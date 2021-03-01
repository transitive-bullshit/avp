import {
  WebGLRenderer,
  Scene,
  Camera,
  MeshBasicMaterial,
  CanvasTexture,
  PlaneGeometry,
  Mesh
} from 'three'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
// import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
// import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js'
// import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass'
// import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'
// import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import {
  AudioVisualization,
  AudioVisualizationOptions
} from './AudioVisualization'

interface HybridAudioVisualizationOptions extends AudioVisualizationOptions {
  offscreenCanvas?: HTMLCanvasElement
}

export class HybridAudioVisualization extends AudioVisualization {
  offscreenCanvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  renderer: WebGLRenderer
  scene: Scene
  camera: Camera
  offscreenCanvasMaterial: MeshBasicMaterial
  composer: EffectComposer

  constructor(opts: HybridAudioVisualizationOptions) {
    super(opts)

    if (opts.offscreenCanvas) {
      this.offscreenCanvas = opts.offscreenCanvas
    } else {
      this.offscreenCanvas = document.createElement('canvas')
      this.offscreenCanvas.width = this.canvas.width
      this.offscreenCanvas.height = this.canvas.height
    }

    const ctx = this.offscreenCanvas.getContext('2d')
    if (ctx) {
      this.ctx = ctx
    } else {
      throw new Error('Unable to initialize offscreen canvas 2d context')
    }

    this.renderer = new WebGLRenderer({
      antialias: true,
      canvas: this.canvas
    })
    this.renderer.setSize(this.canvas.width, this.canvas.height)
    this.renderer.setClearColor(0x000000)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.scene = new Scene()
    this.camera = new Camera()

    this.offscreenCanvasMaterial = new MeshBasicMaterial()
    this.offscreenCanvasMaterial.map = new CanvasTexture(this.offscreenCanvas)

    const geometry = new PlaneGeometry(2, 2)
    const mesh = new Mesh(geometry, this.offscreenCanvasMaterial)
    mesh.scale.setY(-1)
    this.scene.add(mesh)

    this.composer = new EffectComposer(this.renderer)
    this.composer.setSize(this.canvas.width, this.canvas.height)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    // setup any post-processing shader effects
    // @ts-ignore; TODO
    const effect1 = new UnrealBloomPass()
    this.composer.addPass(effect1)
  }

  _resize = () => {
    // TODO: decouple internal canvas size from the output canvas size
    const { width, height } = this.canvas
    this.offscreenCanvas.width = width
    this.offscreenCanvas.height = height
    this.renderer.setSize(width, height)
    this.composer.setSize(width, height)
  }

  protected render() {
    // TODO: remove (testing)
    this.analyser.getFrequencyData()
    // const avg = this.analyser.getAverageFrequency()

    // draw to the offscreen canvas via html5 2d canvas api
    const { width, height } = this.offscreenCanvas
    this.ctx.clearRect(0, 0, width, height)

    const n = this.analyser.data.length
    const invN = width / n
    this.ctx.fillStyle = '#F998B9'

    for (let i = 0; i < n; ++i) {
      const amp = this.analyser.data[i] / 255.0
      const x0 = i * invN
      const y = 0
      const h = amp * height
      this.ctx.fillRect(x0, y, invN, h)
    }

    // render to the final canvas via webgl
    this.offscreenCanvasMaterial.map!.needsUpdate = true

    // render without post-processing
    // this.renderer.render(this.scene, this.camera)

    // render with post-processing
    this.composer.render()
  }
}

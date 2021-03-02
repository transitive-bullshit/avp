import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'

import Meyda from 'meyda'

import {
  HybridAudioVisualization,
  HybridAudioVisualizationOptions
} from './HybridAudioVisualization'

export class BloomFilterAudioVisualization extends HybridAudioVisualization {
  meyda: Meyda.MeydaAnalyzer

  constructor(opts: HybridAudioVisualizationOptions) {
    super(opts)

    this.meyda = Meyda.createMeydaAnalyzer({
      audioContext: this.audio.context,
      source: this.analyser.analyser,
      bufferSize: 512,
      featureExtractors: [
        // 'powerSpectrum',
        // 'spectralCentroid',
        // 'chroma',
        // 'mfcc'
        'loudness'
        // 'powerSpectrum'
      ]
    })

    // setup any post-processing shader effects
    // {
    //   // @ts-ignore; TODO
    //   const effect1 = new UnrealBloomPass()
    //   this.composer.addPass(effect1)
    // }

    // {
    //   const effect1 = new AfterimagePass()
    //   this.composer.addPass(effect1)
    // }
  }

  start() {
    super.start()
    this.meyda.start()
  }

  stop() {
    super.stop()
    this.meyda.stop()
  }

  protected render() {
    // TODO: remove (testing)
    // this.analyser.getFrequencyData()
    // const spectrum = this.analyser.data

    const feature = 'loudness'
    const s = this.meyda.get([feature])
    if (!s) {
      return
    }
    const spectrum = s[feature]?.specific
    if (!spectrum) {
      return
    }

    const { width, height } = this.offscreenCanvas

    const n = spectrum.length
    const invN = width / (n - 1)

    // normalize samples
    let maxS = 0
    let meanS = 0
    for (let i = 0; i < n; ++i) {
      maxS = Math.max(maxS, spectrum[i])
      meanS += spectrum[i]
    }
    meanS /= n
    const diff = maxS - meanS

    const data = []
    for (let i = 0; i < n; ++i) {
      const sample = spectrum[i]
      // take the normalized sample value
      // let value = sample / maxS

      // cutoff any values that are less than the mean
      let value = Math.max(0, (sample - meanS) / diff)

      // accentuate differences in the signal
      // value = Math.max(0, Math.min(1, Math.pow(value, 4)))

      const x = i * invN
      const y = value * height

      data.push({
        value,
        x,
        y
      })
    }

    // draw to the offscreen canvas via html5 2d canvas api
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.save()

    this.ctx.translate(width / 2 - width / 4, height / 2 + height / 3)
    this.ctx.scale(0.5, 1.0 / 20.0)
    this.ctx.fillStyle = '#fff'

    // this.ctx.beginPath()
    // this.ctx.moveTo(0, 0)

    for (let i = 0; i < n - 1; ++i) {
      const { x: x0, y: y0 } = data[i]
      const { x: x1, y: y1 } = data[i + 1]

      const xMid = (x0 + x1) / 2
      const yMid = (y0 + y1) / 2
      const cpx0 = (xMid + x0) / 2
      const cpx1 = (xMid + x1) / 2
      // this.ctx.quadraticCurveTo(cpx0, y0, xMid, yMid)
      // this.ctx.quadraticCurveTo(cpx1, y1, x1, y1)

      // this.ctx.lineTo(x0, y0)

      this.ctx.fillRect(x0, 0, (x1 - x0) / 2, yMid)
    }
    // this.ctx.lineTo(data[data.length - 1].x, 0)
    // this.ctx.closePath()
    // this.ctx.fill()

    this.ctx.restore()

    // tell webgl that the canvas texture needs updating
    this.offscreenCanvasMaterial.map!.needsUpdate = true

    // render without post-processing
    // this.renderer.render(this.scene, this.camera)

    // render with post-processing
    this.composer.render()
  }
}

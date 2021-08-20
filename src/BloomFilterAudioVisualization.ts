/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */

import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'

import Meyda from 'meyda'

import {
  HybridAudioVisualization,
  HybridAudioVisualizationOptions
} from './HybridAudioVisualization'

interface Sample {
  x: number
  y: number
}

type DrawStyle = 'discrete' | 'linear' | 'quadratic'

type MeydaAudioFeature =
  | 'amplitudeSpectrum'
  | 'buffer'
  | 'chroma'
  | 'complexSpectrum'
  | 'energy'
  | 'loudness'
  | 'mfcc'
  | 'perceptualSharpness'
  | 'perceptualSpread'
  | 'powerSpectrum'
  | 'rms'
  | 'spectralCentroid'
  | 'spectralFlatness'
  | 'spectralKurtosis'
  | 'spectralRolloff'
  | 'spectralSkewness'
  | 'spectralSlope'
  | 'spectralSpread'
  | 'zcr'

export interface BloomFilterVisualizationOptions
  extends HybridAudioVisualizationOptions {
  drawStyle?: DrawStyle
  featureExtractor?: MeydaAudioFeature
  smoothingFactor?: number
  accentuationFactor?: number
  visualScalingFactor?: number
  bufferSize?: number
  hopSize?: number
  numberOfBarkBands?: number
}

export class BloomFilterAudioVisualization extends HybridAudioVisualization {
  meyda: Meyda.MeydaAnalyzer
  drawStyle: DrawStyle
  featureExtractor: MeydaAudioFeature
  maxRMS: number
  smoothingFactor: number
  accentuationFactor: number
  visualScalingFactor: number
  _samples: Sample[] = []

  constructor(opts: BloomFilterVisualizationOptions) {
    super(opts)

    this.drawStyle = opts.drawStyle ?? 'discrete'
    this.featureExtractor = opts.featureExtractor ?? 'loudness'
    this.maxRMS = 0
    this.smoothingFactor = Math.max(
      0.0,
      Math.min(1.0, opts.smoothingFactor ?? 0.5)
    )
    this.accentuationFactor = Math.max(
      1.0,
      Math.min(128.0, opts.accentuationFactor ?? 2.0)
    )
    this.visualScalingFactor = Math.max(0.00001, opts.visualScalingFactor ?? 1)

    this.meyda = Meyda.createMeydaAnalyzer({
      audioContext: this.audio.context,
      source: this.analyser.analyser,
      bufferSize: opts.bufferSize ?? 1024,
      // smaller => smoother but more computation
      hopSize: opts.hopSize ?? 512,
      featureExtractors: [this.featureExtractor].concat(['rms']),
      numberOfBarkBands: opts.numberOfBarkBands ?? 32
      // numberOfMFCCCoefficients: 128
      // sampleRate: 100
      // 'powerSpectrum',
      // 'spectralCentroid',
      // 'chroma',
      // 'mfcc'
      // 'loudness'
    } as any)

    // setup any post-processing shader effects
    {
      // @ts-ignore; TODO
      const effect1 = new UnrealBloomPass()
      this.composer.addPass(effect1)
    }

    // {
    //   const effect1 = new AfterimagePass()
    //   this.composer.addPass(effect1)
    // }
  }

  start() {
    super.start()
    this.meyda.start()
  }

  pause() {
    super.pause()
    this.meyda.stop()
  }

  stop() {
    super.stop()
    this.meyda.stop()
  }

  protected render() {
    const { width, height } = this.offscreenCanvas

    // we're relying on meyda for audio analysis
    // this.analyser.getFrequencyData()
    // const spectrum = this.analyser.data

    // weight this frame's spectrum by its relative loudness compared to the
    // loudest frame we've seen so far
    const rms = this.meyda.get('rms') as number
    this.maxRMS = Math.max(this.maxRMS, rms)
    const frameWeight = this.maxRMS <= 0 ? 1.0 : rms / this.maxRMS

    const feature = this.featureExtractor
    const features = this.meyda.get([feature])
    if (!features) {
      return
    }
    const spectrum =
      feature === 'loudness'
        ? features[feature]?.specific
        : (features[feature] as Float32Array | number[])
    if (!spectrum) {
      return
    }
    const n = spectrum.length
    if (n <= 1) {
      return
    }

    if (this._samples?.length !== n) {
      this._samples = new Array(n)
      for (let i = 0; i < n; i++) {
        this._samples[i] = { x: 0, y: 0 }
      }
    }

    const invN = width / (n - 1)

    // normalize samples
    let maxS = 0
    let meanS = 0
    for (let i = 0; i < n; ++i) {
      maxS = Math.max(maxS, spectrum[i])
      meanS += spectrum[i]
    }
    meanS /= n
    // const diff = maxS - meanS

    const w = this.smoothingFactor
    const invW = 1.0 - w

    for (let i = 0; i < n; ++i) {
      const sample = spectrum[i]
      // take the normalized sample value
      let value = sample / maxS

      // cutoff any values that are less than the mean
      // let value = Math.max(0, (sample - meanS) / diff)

      // accentuate differences in the signal
      value = Math.max(0, Math.min(1, Math.pow(value, this.accentuationFactor)))

      const x = i * invN
      const y = value * height * frameWeight

      this._samples[i] = {
        x: this._samples[i].x * w + x * invW,
        y: this._samples[i].y * w + y * invW
      }
    }

    // draw to the offscreen canvas via html5 2d canvas api
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#fff'

    const drawSamples = () => {
      if (this.drawStyle !== 'discrete') {
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
      }

      for (let i = 0; i < n - 1; ++i) {
        const sample0 = this._samples[i]
        const sample1 = this._samples[i + 1]
        const x0 = sample0.x
        const y0 = sample0.y * this.visualScalingFactor
        const x1 = sample1.x
        const y1 = sample1.y * this.visualScalingFactor

        if (this.drawStyle === 'quadratic') {
          const xMid = (x0 + x1) / 2
          const yMid = (y0 + y1) / 2
          const cpx0 = (xMid + x0) / 2
          const cpx1 = (xMid + x1) / 2

          this.ctx.quadraticCurveTo(cpx0, y0, xMid, yMid)
          this.ctx.quadraticCurveTo(cpx1, y1, x1, y1)
        } else if (this.drawStyle === 'linear') {
          this.ctx.lineTo(x0, y0)
        } else {
          const yMid = (y0 + y1) / 2
          this.ctx.fillRect(x0, 0, (x1 - x0) / 2, yMid)
        }
      }

      if (this.drawStyle !== 'discrete') {
        this.ctx.lineTo(this._samples[n - 1].x, 0)
        this.ctx.closePath()
        this.ctx.fill()
      }

      // draw floor
      this.ctx.fillRect(0, 0, width, 4)
    }

    {
      // draw a triangle
      const p0 = {
        x: width / 4,
        y: (height * 3) / 4
      }

      const p1 = {
        x: (width * 3) / 4,
        y: (height * 3) / 4
      }

      const p2 = {
        x: width / 2,
        y: (height * 1) / 4
      }

      const scaleX = (p1.x - p0.x) / width
      const scaleY = 0.15
      const h = p0.y - p2.y
      const w = p2.x - p0.x
      const t0 = Math.atan2(h, w)
      const h0 = Math.sqrt(w * w + h * h)
      const hs = h0 / width

      this.ctx.save()
      this.ctx.translate(p0.x, p0.y)
      this.ctx.scale(scaleX, scaleY)
      drawSamples()
      this.ctx.restore()

      // console.log(h0, width, hs)
      this.ctx.save()
      this.ctx.translate(p0.x, p0.y)
      this.ctx.rotate(-t0)
      this.ctx.scale(hs, -scaleY)
      drawSamples()
      this.ctx.restore()

      this.ctx.save()
      this.ctx.translate(p1.x, p1.y)
      this.ctx.rotate(Math.PI + t0)
      this.ctx.scale(hs, scaleY)
      drawSamples()
      this.ctx.restore()
    }

    // just draw normally
    // this.ctx.save()
    // drawSamples()
    // this.ctx.restore()

    // tell webgl that the canvas texture needs updating
    this.offscreenCanvasMaterial.map!.needsUpdate = true

    // render without post-processing
    // this.renderer.render(this.scene, this.camera)

    // render with post-processing
    this.composer.render()
  }
}

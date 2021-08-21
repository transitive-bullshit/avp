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

export type DrawStyle = 'bars' | 'lines' | 'curves'
export type DrawShape = 'basic' | 'triangle' | 'circle' | 'waveform'

export type MeydaAudioFeature =
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
  drawShape?: DrawShape
  featureExtractor?: MeydaAudioFeature
  smoothingFactor?: number
  accentuationFactor?: number
  visualScalingFactor?: number
  bufferSize?: number
  hopSize?: number
  numberOfBarkBands?: number
  fill?: boolean
  mirror?: boolean
  bloom?: boolean
}

export class BloomFilterAudioVisualization extends HybridAudioVisualization {
  meyda: Meyda.MeydaAnalyzer
  drawStyle: DrawStyle
  drawShape: DrawShape
  featureExtractor: MeydaAudioFeature
  maxRMS: number
  smoothingFactor: number
  accentuationFactor: number
  visualScalingFactor: number
  fill: boolean
  mirror: boolean
  _samples: number[] = []

  constructor(opts: BloomFilterVisualizationOptions) {
    super(opts)

    this.drawStyle = opts.drawStyle ?? 'bars'
    this.drawShape = opts.drawShape ?? 'triangle'
    this.featureExtractor = opts.featureExtractor ?? 'loudness'
    this.maxRMS = 0
    this.smoothingFactor = Math.max(
      0.0,
      Math.min(1.0, opts.smoothingFactor ?? 0.5)
    )
    this.accentuationFactor = Math.max(
      1.0,
      Math.min(16.0, opts.accentuationFactor ?? 2.0)
    )
    this.visualScalingFactor = Math.max(0.00001, opts.visualScalingFactor ?? 1)
    this.fill = !!opts.fill
    this.mirror = !!opts.mirror

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
    if (opts.bloom !== false) {
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
    // update sample values for each frame
    this._update()

    // draw visualization to offscreen canvas
    this._draw()

    // render without post-processing
    // this.renderer.render(this.scene, this.camera)

    // render with post-processing
    this.composer.render()
  }

  protected _update() {
    // weight this frame's spectrum by its relative loudness compared to the
    // loudest frame we've seen so far
    const rms = (this.meyda.get('rms') as number) || 0
    this.maxRMS = Math.max(this.maxRMS, rms)
    const rmsNormalizationWeight = this.maxRMS <= 0 ? 1.0 : rms / this.maxRMS
    // console.log(rms, rmsNormalizationWeight)

    // we're relying on meyda for audio analysis
    // this.analyser.getFrequencyData()
    // const spectrum = this.analyser.data

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

    // lazily initialize initial samples
    if (this._samples?.length !== n) {
      this._samples = []
      for (let i = 0; i < n; i++) {
        this._samples[i] = 0
      }
    }

    // normalize samples
    let maxS = 0
    let meanS = 0
    // let minS = Number.POSITIVE_INFINITY
    for (let i = 0; i < n; ++i) {
      const value = spectrum[i]
      maxS = Math.max(maxS, value)
      // minS = Math.min(minS, value)
      meanS += value
    }
    if (maxS === 0) {
      return
    }

    meanS /= n
    // console.log(minS, maxS, meanS)
    // const diff = maxS - meanS

    const w = this.smoothingFactor
    const invW = 1.0 - w

    for (let i = 0; i < n; ++i) {
      const sample = spectrum[i]
      // take the normalized sample value
      let value = sample / maxS

      // if (feature === 'mfcc') {
      //   value = (sample - minS) / (maxS - minS)
      // }

      // cutoff any values that are less than the mean
      // let value = Math.max(0, (sample - meanS) / diff)

      // accentuate differences in the signal
      value = Math.max(0, Math.min(1, Math.pow(value, this.accentuationFactor)))

      const y = value * rmsNormalizationWeight
      this._samples[i] = this._samples[i] * w + y * invW
    }
  }

  protected _draw() {
    const n = this._samples.length
    const { width, height } = this.offscreenCanvas

    const drawSamples = (
      samples: number[] = this._samples,
      // coordinate transformation
      t: (x: number, y: number) => { x: number; y: number } = (x, y) => ({
        x: (x / (n - 1)) * width,
        y: y * this.visualScalingFactor * height
      })
    ) => {
      const n = samples.length
      if (this.drawStyle !== 'bars') {
        if (this.drawShape === 'circle') {
          this.ctx.beginPath()
          const p = t(0, samples[0])
          this.ctx.moveTo(p.x, p.y)
        } else {
          this.ctx.beginPath()
          const p = t(0, 0)
          this.ctx.moveTo(p.x, p.y)
        }
      }

      for (let i = 0; i < n - 1; ++i) {
        const sample0 = samples[i]
        const sample1 = samples[i + 1]
        const x0 = i
        const y0 = sample0
        const x1 = i + 1
        const y1 = sample1

        if (this.drawStyle === 'curves') {
          const xMid = (x0 + x1) / 2
          const yMid = (y0 + y1) / 2
          const cpx0 = (xMid + x0) / 2
          const cpx1 = (xMid + x1) / 2

          const cp0 = t(cpx0, y0)
          const cp1 = t(xMid, yMid)
          const cp2 = t(cpx1, y1)
          const cp3 = t(x1, y1)
          this.ctx.quadraticCurveTo(cp0.x, cp0.y, cp1.x, cp1.y)
          this.ctx.quadraticCurveTo(cp2.x, cp2.y, cp3.x, cp3.y)
        } else if (this.drawStyle === 'lines') {
          const p0 = t(x0, y0)
          this.ctx.lineTo(p0.x, p0.y)
        } else if (this.drawStyle === 'bars') {
          const yMid = (y0 + y1) / 2

          if (this.fill) {
            const p0 = t(x0, 0)
            const p1 = t((x1 - x0) / 2, yMid)

            if (this.drawShape === 'circle') {
              const xMid = (x0 + x1) / 2

              const p0 = t(x0, 0)
              const p1 = t(x0, yMid)
              const p2 = t(xMid, yMid)
              const p3 = t(xMid, 0)

              this.ctx.beginPath()
              this.ctx.moveTo(p0.x, p0.y)
              this.ctx.lineTo(p1.x, p1.y)
              this.ctx.lineTo(p2.x, p2.y)
              this.ctx.lineTo(p3.x, p3.y)
              this.ctx.closePath()
              this.ctx.fill()
            } else {
              this.ctx.fillRect(p0.x, p0.y, p1.x, p1.y)
            }
          } else {
            const p0 = t(x0, 0)
            const p1 = t(x0, y0)

            this.ctx.beginPath()
            this.ctx.moveTo(p0.x, p0.y)
            this.ctx.lineTo(p1.x, p1.y)
            this.ctx.stroke()
          }
        }
      }

      if (this.drawShape === 'circle') {
        return
      }

      if (this.drawStyle !== 'bars') {
        const p0 = t(n - 1, 0)
        this.ctx.lineTo(p0.x, p0.y)

        if (this.fill) {
          this.ctx.closePath()
          this.ctx.fill()
        } else {
          this.ctx.stroke()
        }
      }

      // draw floor
      if (this.fill) {
        const p0 = t(0, 0)
        const p1 = t(n - 1, 4 / (this.visualScalingFactor * height))

        this.ctx.fillRect(p0.x, p0.y, p1.x, p1.y)
      }
    }

    // draw to the offscreen canvas via html5 2d canvas api
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#fff'
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = 4

    if (this.drawShape === 'basic') {
      // just draw normally
      this.ctx.save()
      drawSamples()
      this.ctx.restore()
    } else if (this.drawShape === 'triangle') {
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
    } else if (this.drawShape === 'circle') {
      const r = width / 4
      const f = (width / 8) * this.visualScalingFactor

      if (this.fill) {
        this.ctx.save()
        this.ctx.translate(width / 2, height / 2)
        this.ctx.strokeStyle = '#fff'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.ellipse(0, 0, r, r, 0, 0, 2 * Math.PI)
        this.ctx.stroke()
        this.ctx.restore()
      }

      this.ctx.save()
      this.ctx.translate(width / 2, height / 2)
      const t0 = (i: number, d: number) => {
        const theta = (i / n) * 2 * Math.PI
        const dist = r + d * f

        return {
          x: Math.cos(theta) * dist,
          y: Math.sin(theta) * dist
        }
      }
      drawSamples(this._samples.concat([this._samples[0]]), t0)

      // TODO: move this pre and post stuff to drawSamples...
      if (this.drawStyle !== 'bars') {
        if (this.fill) {
          for (let i = 0; i < n; ++i) {
            const p0 = t0(n - i - 1, 0)

            this.ctx.lineTo(p0.x, p0.y)
          }

          this.ctx.closePath()
          this.ctx.fill()
        } else {
          const p0 = t0(n, this._samples[0])
          this.ctx.lineTo(p0.x, p0.y)
          this.ctx.stroke()
        }
      }

      this.ctx.restore()
    } else if (this.drawShape === 'waveform') {
      this.ctx.save()
      this.ctx.translate(0, height / 2)
      this.ctx.scale(1.0, 0.25)
      drawSamples()
      this.ctx.restore()

      this.ctx.save()
      this.ctx.translate(0, height / 2)
      this.ctx.scale(1.0, -0.25)
      drawSamples()
      this.ctx.restore()
    }

    // tell webgl that the canvas texture needs updating
    this.offscreenCanvasMaterial.map!.needsUpdate = true
  }
}

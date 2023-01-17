import { TextureLoader, Vector2, VideoTexture } from 'three'

// import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { UnrealBloomPass } from './TransparentBackgroundFixedUnrealBloomPass'
// import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass'
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'
// import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import { BGPass } from './BGPass'

import Meyda from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa'

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

export interface MeydaHybridVisualizationOptions
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
  glitch?: boolean
}

export class MeydaHybridAudioVisualization extends HybridAudioVisualization {
  meyda: MeydaAnalyzer
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

  _bloom = false
  _glitch = false
  _bloomPass: UnrealBloomPass
  _glitchPass: GlitchPass

  _bg: HTMLVideoElement

  constructor(opts: MeydaHybridVisualizationOptions) {
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
      // smaller => slightly smoother but more computation
      hopSize: opts.hopSize ?? 512,
      featureExtractors: [this.featureExtractor].concat(['rms']),
      numberOfBarkBands: opts.numberOfBarkBands ?? 32
      // numberOfMFCCCoefficients: 128
    } as any)

    // setup post-processing shader effects
    this._bloomPass = new UnrealBloomPass(new Vector2(256, 256), 1.0, 0.1)

    // TODO: maybe make glitches respond to audio signal peaks?
    this._glitchPass = new GlitchPass()

    this.bloom = opts.bloom !== false
    this.glitch = !!opts.glitch

    // {
    //   const effect1 = new FilmPass(10, 2, 2048)
    //   this.composer.addPass(effect1)
    // }

    // {
    //   const effect1 = new AfterimagePass()
    //   this.composer.addPass(effect1)
    // }

    {
      // should be after any passes we don't want affected by effects
      const video = document.createElement('video')
      video.src = '/bg.mp4'
      video.loop = true
      this._bg = video
      const t = new VideoTexture(video)

      // const t = new TextureLoader().load('/bg1.jpg')
      this.composer.addPass(new BGPass(t))
    }
  }

  get bloom(): boolean {
    return this._bloom
  }

  set bloom(value: boolean) {
    if (!!value !== this._bloom) {
      this._bloom = !!value

      if (this._bloom) {
        this.composer.insertPass(
          this._bloomPass,
          Math.max(1, this.composer.passes.length - 1)
        )
      } else {
        this.composer.removePass(this._bloomPass)
      }
    }
  }

  get glitch(): boolean {
    return this._glitch
  }

  set glitch(value: boolean) {
    if (!!value !== this._glitch) {
      this._glitch = !!value

      if (this._glitch) {
        this.composer.insertPass(
          this._glitchPass,
          Math.max(1, this.composer.passes.length - 1)
        )
      } else {
        this.composer.removePass(this._glitchPass)
      }
    }
  }

  async start() {
    this._bg.play()
    // if (this._bg) {
    //   await new Promise((resolve, reject) => {
    //     this._bg.onabort('
    //   })
    // }

    await super.start()
    this.meyda.start()
  }

  pause() {
    super.pause()
    this._bg?.pause()
    this.meyda.stop()
  }

  stop() {
    super.stop()
    if (this._bg) {
      this._bg.pause()
      this._bg.currentTime = 0
    }
    this.meyda.stop()
  }

  protected render() {
    // update sample values for each frame
    this._update()

    // draw visualization to offscreen canvas
    this._draw()

    // render without post-processing
    // this.renderer.clear()
    // this.renderer.render(this.scene2, this.camera)
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const { width, height } = this.offscreenCanvas

    const drawSamples = (
      samples: number[] = this._samples,
      // coordinate transformation
      t: (x: number, y: number) => { x: number; y: number } = (x, y) => ({
        x: x * width,
        y: y * this.visualScalingFactor * height
      }),
      mirrored = false
    ) => {
      // TODO: do we want to override n here for circles?
      const n = samples.length
      const invN = 1.0 / (n - 1)

      if (this.mirror && !mirrored) {
        if (this.drawShape === 'circle') {
          this.ctx.save()
          drawSamples(samples, (x, y) => t(x / 2, y), true)
          this.ctx.restore()

          this.ctx.save()
          drawSamples(samples, (x, y) => t(n - x / 2 - 1, y), true)
          this.ctx.restore()
        } else {
          this.ctx.save()
          this.ctx.translate(0, 0)
          this.ctx.scale(0.5, 1)
          drawSamples(samples, t, true)
          this.ctx.restore()

          this.ctx.save()
          this.ctx.translate(width, 0)
          this.ctx.scale(-0.5, 1)
          drawSamples(samples, t, true)
          this.ctx.restore()
        }
        return
      }

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
        const x0 = i * invN
        const y0 = samples[i]
        const x1 = (i + 1) * invN
        const y1 = samples[i + 1]

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
        if (this.drawStyle !== 'bars') {
          if (this.fill) {
            const k = 256
            for (let i = 0; i < k; ++i) {
              const p0 = t((k - i) / (k - 1), 0)

              this.ctx.lineTo(p0.x, p0.y)
            }

            this.ctx.closePath()
            this.ctx.fill()
          } else {
            const p0 = t(1.0, this._samples[0])
            this.ctx.lineTo(p0.x, p0.y)
            this.ctx.stroke()
          }
        }

        // draw floor
        if (this.fill) {
          const p0 = t(0, 0) as any
          const p1 = t(1.0, 0) as any

          this.ctx.save()
          this.ctx.beginPath()
          this.ctx.ellipse(
            0,
            0,
            p0.r,
            p0.r,
            0,
            Math.min(p0.theta, p1.theta),
            Math.max(p0.theta, p1.theta)
          )
          this.ctx.stroke()
          this.ctx.restore()
        }
      } else {
        if (this.drawStyle !== 'bars') {
          const p0 = t(1.0, 0)
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
          const p1 = t(1.0, 4 / (this.visualScalingFactor * height))

          this.ctx.fillRect(p0.x, p0.y, p1.x, p1.y)
        }
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

      // if (this.fill) {
      //   this.ctx.save()
      //   this.ctx.translate(width / 2, height / 2)
      //   this.ctx.strokeStyle = '#fff'
      //   this.ctx.lineWidth = 2
      //   this.ctx.beginPath()
      //   this.ctx.ellipse(0, 0, r, r, 0, 0, 2 * Math.PI)
      //   this.ctx.stroke()
      //   this.ctx.restore()
      // }

      this.ctx.save()
      this.ctx.translate(width / 2, height / 2)
      drawSamples(
        this._samples.concat([this._samples[0]]),
        (x: number, d: number) => {
          const theta = x * 2 * Math.PI
          const dist = r + d * f

          return {
            theta,
            r,
            dist,
            x: Math.cos(theta) * dist,
            y: Math.sin(theta) * dist
          }
        }
      )
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

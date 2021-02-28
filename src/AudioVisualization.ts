import {
  AudioListener as ThreeAudioListener,
  Audio as ThreeAudio,
  AudioLoader as ThreeAudioLoader,
  AudioAnalyser as ThreeAudioAnalyser
} from 'three'

import raf from 'raf'

export interface AudioVisualizationOptions {
  /**
   * A Canvas where the renderer draws its output.
   */
  canvas: HTMLCanvasElement | OffscreenCanvas

  mediaElement?: HTMLMediaElement
  mediaStream?: MediaStream
  mediaUrl?: string

  autoplay?: boolean
  fftSize?: number
}

export type AnimationStatus = 'stopped' | 'playing'

export abstract class AudioVisualization {
  domElement: HTMLCanvasElement | OffscreenCanvas

  mediaElement?: HTMLMediaElement
  mediaStream?: MediaStream
  mediaUrl?: string

  listener: ThreeAudioListener
  audio: ThreeAudio
  analyser: ThreeAudioAnalyser

  status: AnimationStatus
  protected _rafHandle: number | null

  constructor(opts: AudioVisualizationOptions) {
    this.status = 'stopped'
    this._rafHandle = null

    this.domElement = opts.canvas

    this.mediaElement = opts.mediaElement
    this.mediaStream = opts.mediaStream
    this.mediaUrl = opts.mediaUrl

    this.listener = new ThreeAudioListener()
    this.audio = new ThreeAudio(this.listener)

    if (this.mediaUrl) {
      if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
        const loader = new ThreeAudioLoader()
        loader.load(this.mediaUrl, (buffer: any) => {
          this.audio.setBuffer(buffer)
          if (opts.autoplay) {
            this.audio.play()
          }
        })
      } else {
        const mediaElement = new Audio(this.mediaUrl)
        if (opts.autoplay) {
          mediaElement.play()
        }

        this.audio.setMediaElementSource(mediaElement)
      }
    } else if (this.mediaElement) {
      this.audio.setMediaElementSource(this.mediaElement)
      if (opts.autoplay) {
        this.mediaElement.play()
      }
    } else if (this.mediaStream) {
      this.audio.setMediaStreamSource(this.mediaStream)
    } else {
      throw new Error(
        'AudioVisualization requires one of "mediaElement", "mediaStream", or "mediaUrl"'
      )
    }

    const fftSize = opts.fftSize || 1024
    this.analyser = new ThreeAudioAnalyser(this.audio, fftSize)
  }

  public start() {
    if (this.status === 'stopped') {
      this.status = 'playing'
      this._animate()
    }
  }

  public stop() {
    this.status = 'stopped'

    if (this._rafHandle) {
      raf.cancel(this._rafHandle)
      this._rafHandle = null
    }
  }

  protected _animate() {
    if (this.status !== 'playing') {
      this._rafHandle = null
      return
    }

    this._rafHandle = raf(this._animate.bind(this))
    this.render()
  }

  protected abstract render(): void
}

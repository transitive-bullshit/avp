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

  // input audio
  mediaElement?: HTMLMediaElement
  mediaStream?: MediaStream
  mediaUrl?: string

  // misc settings
  autoplay?: boolean
  fftSize?: number
  isRecordingEnabled?: boolean
  frameRequestRate?: number

  mediaRecorderOptions?: MediaRecorderOptions
}

export type AnimationStatus = 'stopped' | 'playing'

export abstract class AudioVisualization {
  // visual output canvas
  canvas: HTMLCanvasElement | OffscreenCanvas

  // audio input
  mediaElement?: HTMLMediaElement
  mediaStream?: MediaStream
  mediaUrl?: string

  // recording output
  mediaRecorder?: MediaRecorder
  recordingP?: Promise<void>
  frameRequestRate: number
  mediaRecorderOptions: MediaRecorderOptions
  mediaRecorderChunks: BlobPart[] = []

  // internal audio analysis
  listener: ThreeAudioListener
  audio: ThreeAudio
  analyser: ThreeAudioAnalyser

  protected _rafHandle: number | null
  protected _isRecordingEnabled: boolean

  constructor(opts: AudioVisualizationOptions) {
    this._rafHandle = null

    if (!opts.canvas) {
      throw new Error('AudioVisualization requires "canvas"')
    }

    this.canvas = opts.canvas

    this.mediaElement = opts.mediaElement
    this.mediaStream = opts.mediaStream
    this.mediaUrl = opts.mediaUrl

    this.listener = new ThreeAudioListener()
    this.audio = new ThreeAudio(this.listener)

    this._isRecordingEnabled = !!opts.isRecordingEnabled
    this.frameRequestRate = opts.frameRequestRate ?? 60
    this.mediaRecorderOptions = {
      mimeType: 'video/webm',
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 4500000,
      ...opts.mediaRecorderOptions
    }

    if (this.mediaUrl) {
      if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
        // TODO: this will break recording right now
        const loader = new ThreeAudioLoader()
        loader.load(this.mediaUrl, (buffer: any) => {
          this.audio.setBuffer(buffer)
          if (opts.autoplay) {
            this.audio.play()
          }
        })
      } else {
        const mediaElement = new Audio(this.mediaUrl)
        this.mediaElement = mediaElement
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
    // window.addEventListener('resize', this._resize.bind(this))
  }

  dispose() {
    this.stop()
    // window.removeEventListener('resize', this._resize.bind(this))
    this.audio.disconnect()
  }

  protected _resize() {
    // TODO: override in subclass
  }

  public get isPlaying(): boolean {
    // TODO: this is super janky
    return !!(
      this.mediaElement &&
      this.mediaElement!.currentTime > 0 &&
      !this.mediaElement!.paused &&
      !this.mediaElement!.ended &&
      this.mediaElement!.readyState > 2
    )
    // return this.audio.isPlaying
  }

  public get isRecordingEnabled() {
    return this._isRecordingEnabled
  }

  public set isRecordingEnabled(value: boolean) {
    if (!!value !== this._isRecordingEnabled) {
      if (this.isPlaying) {
        throw new Error(
          'AudioVisualization.isRecordingEnabled may only be set when audio is stopped'
        )
      }

      this._isRecordingEnabled = !!value
    }
  }

  public get isRecording() {
    return this._isRecordingEnabled && this.isPlaying
  }

  public async start() {
    if (!this.isPlaying) {
      this.mediaElement?.play()
      this.audio.play()
      this._animate()

      if (this._isRecordingEnabled) {
        // TODO: handle pausing
        // TODO: does this work with offscreencanvas?
        const captureStream = (this.canvas as HTMLCanvasElement).captureStream(
          this.frameRequestRate
        )

        const waitForAudioTrackP = new Promise<void>((resolve, reject) => {
          const stream: MediaStream =
            this.mediaStream ?? (this.mediaElement as any).captureStream()
          let audioTracks = stream.getAudioTracks()

          if (audioTracks.length) {
            for (const audioTrack of audioTracks) {
              console.log('audio track', audioTrack)
              captureStream.addTrack(audioTrack)
            }
            resolve()
          } else {
            setTimeout(
              () =>
                reject(
                  new Error(
                    'timeout initializing audio track for mediarecorder'
                  )
                ),
              10000
            )

            stream.onaddtrack = (ev) => {
              let hasAudioTrack = false
              audioTracks = stream.getAudioTracks()
              for (const audioTrack of audioTracks) {
                if (audioTrack.id === ev.track.id) {
                  console.log('audio track', audioTrack)
                  hasAudioTrack = true
                  captureStream.addTrack(audioTrack)
                }
              }

              if (hasAudioTrack) {
                resolve()
              }
            }
          }
        })

        console.log({
          captureStream,
          mediaRecorderOptions: this.mediaRecorderOptions
        })

        this.mediaRecorder = new MediaRecorder(
          captureStream,
          this.mediaRecorderOptions
        )
        this.mediaRecorderChunks = []

        this.recordingP = new Promise<void>((resolve, reject) => {
          if (!this.mediaRecorder) return

          this.mediaRecorder.ondataavailable = (e: any) =>
            this.mediaRecorderChunks.push(e.data)
          this.mediaRecorder.onerror = (ev) => {
            console.warn('mediarecorder ERROR', ev)
            reject(ev)
          }
          this.mediaRecorder.onstop = (ev) => {
            console.log('mediarecorder STOP', ev)
            resolve()
          }

          waitForAudioTrackP
            .then(() => {
              this.mediaRecorder?.start()
            })
            .catch(reject)
        }).then(() => {
          // TODO: cleanup
          const mimeType = this.mediaRecorderOptions.mimeType
          const blob = new Blob(this.mediaRecorderChunks, {
            type: mimeType
          })
          const p = mimeType!.split('/')
          const ext = p[p.length - 1]

          const filename = `test.${ext}`
          console.log('download', blob.size, filename)

          const downloadAnchor = document.createElement('a')
          downloadAnchor.onclick = () => {
            downloadAnchor.href = URL.createObjectURL(blob)
            downloadAnchor.download = filename
          }
          downloadAnchor.click()
        })

        return waitForAudioTrackP
      }
    }
  }

  public pause() {
    this.mediaRecorder?.pause()
    this.mediaElement?.pause()
    this.audio.pause()
    this._cancelAnimation()
  }

  public stop() {
    this.mediaRecorder?.stop()
    delete this.mediaRecorder

    this.mediaElement?.pause()
    this.audio.stop()
    this._cancelAnimation()
  }

  protected _cancelAnimation() {
    if (this._rafHandle) {
      raf.cancel(this._rafHandle)
      this._rafHandle = null
    }
  }

  protected _animate() {
    this._rafHandle = raf(this._animate.bind(this))
    this.render()
  }

  // TODO: override in subclass
  protected abstract render(): void
}

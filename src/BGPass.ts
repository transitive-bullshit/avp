/* eslint-disable dot-notation */

import {
  ShaderMaterial,
  UniformsUtils,
  WebGLRenderer,
  WebGLRenderTarget,
  Texture
} from 'three'

import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { BGShader } from './BGShader'

export class BGPass extends Pass {
  map: Texture
  uniforms: any
  material: ShaderMaterial
  fsQuad: FullScreenQuad

  constructor(map: Texture) {
    super()

    const shader = BGShader

    this.map = map

    this.uniforms = UniformsUtils.clone(shader.uniforms)

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      depthTest: false,
      depthWrite: false
    })

    this.needsSwap = true
    this.clear = false

    this.fsQuad = new FullScreenQuad()
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget
    // deltaTime: number,
    // maskActive: boolean,
  ) {
    const oldAutoClear = renderer.autoClear
    renderer.autoClear = false

    this.fsQuad.material = this.material

    this.uniforms['tBG'].value = this.map
    this.uniforms['tFG'].value = readBuffer.texture
    this.material.transparent = false

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
    }

    if (this.clear) renderer.clear()
    this.fsQuad.render(renderer)

    renderer.autoClear = oldAutoClear
  }

  dispose() {
    this.material.dispose()

    this.fsQuad.dispose()
  }
}

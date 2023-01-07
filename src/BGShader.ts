export const BGShader = {
  uniforms: {
    tBG: { value: null },
    tFG: { value: null }
  },

  vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

  fragmentShader: /* glsl */ `

		#include <common>

		uniform sampler2D tBG;
		uniform sampler2D tFG;

		varying vec2 vUv;

		void main() {

			vec4 bg = texture2D( tBG, vUv );
			vec4 fg = texture2D( tFG, vUv );

      vec3 res = bg.rgb * (1.0 - fg.a) + fg.rgb * (fg.a);

			gl_FragColor =  vec4( res, bg.a );

		}`
}

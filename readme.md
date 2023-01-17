<p align="center">
  <video width="480" src="https://user-images.githubusercontent.com/552829/212808615-b0851d98-078d-4249-9a7b-9d7c085fd95f.mp4"></video>
  <i>(quick demo; enable sound)</i>
</p>

# Audio Visual Playground

[![Build Status](https://github.com/transitive-bullshit/avp/actions/workflows/test.yml/badge.svg)](https://github.com/transitive-bullshit/avp/actions/workflows/test.yml) [![MIT License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/transitive-bullshit/avp/blob/main/license) [![Prettier Code Formatting](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

## How it works

- [Animated stable diffusion](https://replicate.com/andreasjansson/stable-diffusion-animation) - Hosted on Replicate
- WebGL, [three.js](https://threejs.org/), glsl for rendering
- [Meyda](https://meyda.js.org/) for audio feature extraction
- [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) for recording video in-browser
  - Great so I don't need to host any heavyweight servers
- [ffmpeg](https://ffmpeg.org/) for converting webm ⇒ mp4
  - `ffmpeg -i test.webm  -ss 0.05 -vf scale="iw/2:ih/2" -c:v libx264 -crf 16 -movflags faststart -pix_fmt yuv420p -r 40 -profile:v main -preset medium test.mp4`

## TODO

- [x] add stroke styles in addition to fill
- [x] add circle style
- [x] add mirror option
- [x] fix output pixel density
- [x] start/pause/stop should be async
- [ ] separate download or get blob methods
- [ ] mp4 output support
- [ ] render offscreen sped-up
- [ ] add demo to readme
- [ ] add basic docs
- [x] hosted demo
- [ ] explore backgrounds, color palettes, and avatars
- [ ] explore different post-processing effects
- [ ] add descript-style animated captions
- [ ] add UX for generating custom backgrounds using replicate API

## Inspiration

- https://www.youtube.com/watch?v=QykkWNOtap4
- https://www.youtube.com/watch?v=Q1bxyKOZ5RI

## License

MIT © [Travis Fischer](https://transitivebullsh.it)

If you found this project interesting, please consider [sponsoring me](https://github.com/sponsors/transitive-bullshit) or <a href="https://twitter.com/transitive_bs">following me on twitter <img src="https://storage.googleapis.com/saasify-assets/twitter-logo.svg" alt="twitter" height="24px" align="center"></a>

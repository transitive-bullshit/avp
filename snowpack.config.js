module.exports = {
  plugins: ['@snowpack/plugin-typescript'],
  mount: {
    public: { url: '/', static: true },
    audio: { url: '/audio', static: true },
    src: { url: '/dist' }
  }
}

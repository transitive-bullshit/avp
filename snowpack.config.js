module.exports = {
  plugins: ['@snowpack/plugin-typescript'],
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' }
  }
}

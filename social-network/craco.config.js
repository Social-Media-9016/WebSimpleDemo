module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 添加 Node.js 核心模块的 fallback 配置
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        dns: false,
        stream: false,
        util: false,
        buffer: false
      };
      
      return webpackConfig;
    },
  },
};
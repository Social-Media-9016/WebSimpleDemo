const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      "crypto": false,
      "fs": false,
      "path": false,
      "os": false,
      "net": false,
      "tls": false,
      "dns": false,
      "stream": false,
      "util": false,
      "buffer": false
    }
  }
}; 
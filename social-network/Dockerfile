# Build front-end
FROM node:16-alpine as build

WORKDIR /app

# 安装必要的构建工具
RUN apk add --no-cache python3 make g++

# 复制package文件
COPY package*.json ./

# 安装依赖（保留pg模块引用但后面会替换为mock）
RUN npm ci

# 创建PG模块的mock实现
RUN mkdir -p node_modules/pg/lib
RUN echo 'module.exports = { Pool: function() { return { query: function() { return Promise.resolve([]); } } } };' > node_modules/pg/index.js
RUN echo 'module.exports = { Client: function() { return { connect: function() {}, query: function() { return Promise.resolve([]); } } } };' > node_modules/pg/lib/index.js

# 创建DNS模块的mock实现
RUN mkdir -p src/mock/dns
RUN echo 'module.exports = {}; module.exports.default = {};' > src/mock/dns/index.js
RUN echo '{ "name": "dns", "version": "3.1.0", "private": true }' > src/mock/dns/package.json

# 复制前端代码
COPY . .

# 创建mock服务目录，确保services/dbService.js存在可用的模拟实现
RUN mkdir -p src/services
RUN if [ -f src/services/dbService.js ]; then \
      sed -i 's/require(["\x27]pg["\x27])/require(\"..\/..\/.mock\/pg\")/g' src/services/dbService.js; \
      sed -i 's/import.*from ["\x27]pg["\x27]/import { Pool } from \"..\/..\/.mock\/pg\"/g' src/services/dbService.js; \
    else \
      echo 'export const db = { query: () => Promise.resolve([]) };' > src/services/dbService.js; \
    fi

# 创建pg模块的全局mock
RUN mkdir -p .mock/pg
RUN echo 'export const Pool = function() { return { query: () => Promise.resolve([]) }; };' > .mock/pg/index.js

# 创建webpack配置以解决扩展名问题
RUN if [ ! -f webpack.config.js ]; then \
      echo "const path = require('path'); \
      module.exports = { \
        resolve: { \
          extensions: ['.js', '.jsx', '.ts', '.tsx'], \
          alias: { \
            'pg': path.resolve(__dirname, '.mock/pg') \
          }, \
          fallback: { \
            net: false, \
            tls: false, \
            fs: false, \
            path: false, \
            dns: false, \
            os: false \
          } \
        } \
      };" > webpack.config.js; \
    else \
      sed -i '/resolve:/d; /extensions:/d; /fallback:/d; /alias:/d' webpack.config.js && \
      sed -i '/module.exports/a \ \ resolve: { \n    extensions: [\".js\", \".jsx\", \".ts\", \".tsx\"], \n    alias: { \n      \"pg\": path.resolve(__dirname, \".mock/pg\") \n    }, \n    fallback: { \n      net: false, \n      tls: false, \n      fs: false, \n      path: false, \n      dns: false, \n      os: false \n    } \n  },' webpack.config.js; \
    fi

# 创建环境变量文件
RUN echo "REACT_APP_PG_ENABLED=false" > .env.production
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# 构建React应用
RUN npm run build

# 生产镜像
FROM nginx:alpine

# 创建Nginx缓存目录
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && chmod -R 755 /var/cache/nginx

# 删除默认静态资源
RUN rm -rf /usr/share/nginx/html/*

# 复制静态文件
COPY --from=build /app/build /usr/share/nginx/html

# 设置正确的权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

# 暴露端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]

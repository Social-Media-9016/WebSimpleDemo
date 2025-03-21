# Build front-end
FROM node:16-alpine as build

WORKDIR /app

# 安装必要的构建工具
RUN apk add --no-cache python3 make g++

# 复制package文件
COPY package*.json ./

# 创建临时package.json，将pg模块标记为可选依赖
RUN cp package.json package.json.orig && \
    cat package.json | sed 's/"pg": "\(.*\)"/"pg": "\1", "optional": true/g' > package.json.tmp && \
    mv package.json.tmp package.json

# 安装依赖但忽略可选依赖（包括pg）
RUN npm ci --ignore-scripts --omit=optional

# 创建mock pg模块以满足导入需求
RUN mkdir -p node_modules/pg/lib
RUN echo 'module.exports = { Pool: function() { return { query: () => Promise.resolve({ rows: [], rowCount: 0 }) }; } };' > node_modules/pg/index.js
RUN echo 'module.exports = { Client: function() { return { connect: () => {}, query: () => Promise.resolve({ rows: [], rowCount: 0 }) }; } };' > node_modules/pg/lib/index.js

# 复制前端代码
COPY . .

# 创建生产环境变量文件，标记前端不使用PG
RUN echo "REACT_APP_PG_ENABLED=false" > .env.production
RUN echo "REACT_APP_API_URL=http://backend-service" >> .env.production

# 创建webpack配置
RUN echo "const path = require('path'); \
module.exports = { \
  resolve: { \
    extensions: ['.js', '.jsx', '.ts', '.tsx'], \
    fallback: { \
      net: false, \
      tls: false, \
      fs: false, \
      path: false, \
      dns: false, \
      os: false, \
      crypto: false, \
      stream: false, \
      util: false, \
      buffer: false \
    } \
  } \
};" > webpack.config.js

# 设置环境变量
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# 构建React应用
RUN npm run build

# 后端构建阶段（可选，如果有单独的后端服务）
FROM node:16-alpine as backend

WORKDIR /app

# 安装postgresql客户端和构建工具
RUN apk add --no-cache postgresql-client python3 make g++

# 复制package文件
COPY package*.json ./

# 安装所有依赖
RUN npm ci

# 复制后端代码
COPY ./server ./server
COPY ./src/services ./src/services
COPY ./src/config ./src/config

# 设置PostgreSQL环境变量
ENV PG_HOST=postgres-db
ENV PG_PORT=5432
ENV PG_DATABASE=social_network
ENV PG_USER=postgres
ENV PG_PASSWORD=postgres
ENV PG_ENABLED=true

# 最终前端镜像
FROM nginx:alpine as frontend

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 创建Nginx缓存目录
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && chmod -R 755 /var/cache/nginx

# 删除默认静态资源
RUN rm -rf /usr/share/nginx/html/*

# 复制静态文件
COPY --from=build /app/build /usr/share/nginx/html

# 复制nginx配置，添加反向代理到后端
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 设置正确的权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# 暴露端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]

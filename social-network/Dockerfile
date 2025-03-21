# Build stage based on Node.js official image
FROM node:14-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build React application
RUN npm run build

# 使用同一个镜像提供API服务和静态资源
FROM node:14-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和依赖
COPY package*.json ./
RUN npm install --production

# 复制服务器代码
COPY server ./server
# 复制构建后的React应用
COPY --from=build /app/build ./build

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npm", "run", "server"]
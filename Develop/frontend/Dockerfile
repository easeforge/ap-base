# 階段 1: 建置階段
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install --legacy-peer-deps

# 建置時注入 API URL（空字串 = 使用 nginx 相對路徑代理）
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 複製所有檔案
COPY . .

# 建置生產版本
RUN npm run build

# 階段 2: 生產階段
FROM nginx:alpine

# 複製建置結果到 nginx
COPY --from=builder /app/build /usr/share/nginx/html

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]

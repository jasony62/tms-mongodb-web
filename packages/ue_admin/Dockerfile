#基于alpine的nodejs基础镜像
FROM node:16.14.2-alpine3.15 AS builder

# 更改npm镜像
RUN yarn config set registry https://registry.npm.taobao.org --global && \
  yarn config set disturl https://npm.taobao.org/dist --global

WORKDIR /usr/src/app

COPY . .

# 生成.env文件
ARG vite_base_url
ARG vite_back_auth_base
ARG vite_back_api_base
ARG vite_back_api_fs
ARG vite_storetoken_way
ARG vite_tmw_require_bucket
ARG vite_encrypt_secret


RUN  echo VITE_BASE_URL=$vite_base_url >> .env && \
  echo VITE_BACK_AUTH_BASE=$vite_back_auth_base >> .env && \
  echo VITE_BACK_API_BASE=$vite_back_api_base >> .env && \
  echo VITE_BACK_API_FS=$vite_back_api_fs >> .env && \
  echo VITE_STORETOKEN_WAY=$vite_storetoken_way >> .env && \
  echo VITE_TMW_REQUIRE_BUCKET=$vite_tmw_require_bucket >> .env && \
  echo VITE_ENCRYPT_SECRET=$vite_encrypt_secret >> .env


# 安装依赖包，构建代码
RUN yarn && yarn build

# 标准基础镜像（部署阶段）
FROM nginx:alpine

# 设置时区
RUN sed -i 's?http://dl-cdn.alpinelinux.org/?https://mirrors.aliyun.com/?' /etc/apk/repositories && \
  apk add -U tzdata && \
  cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  apk del tzdata

# 修改配置文件
ADD ./nginx.conf.template /etc/nginx/nginx.conf.template

ADD ./start_nginx.sh /usr/local/bin/start_nginx.sh

RUN chmod +x /usr/local/bin/start_nginx.sh

# 将构建阶段代码放在指定位置
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

CMD ["start_nginx.sh"]
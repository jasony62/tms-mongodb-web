#基于alpine的nodejs基础镜像
FROM node:18-alpine AS builder

# 修改npm源
RUN npm config set registry https://registry.npmmirror.com

# 安装基础包
RUN npm install --location=global pnpm typescript

# WORKDIR /usr/src/app

# COPY . .

# # 生成.env文件
# ARG vite_base_url
# ARG vite_back_auth_base
# ARG vite_back_api_base
# ARG vite_back_api_fs
# ARG vite_storetoken_way
# ARG vite_tmw_require_bucket
# ARG vite_encrypt_secret


# RUN  echo VITE_BASE_URL=$vite_base_url >> .env && \
#   echo VITE_BACK_AUTH_BASE=$vite_back_auth_base >> .env && \
#   echo VITE_BACK_API_BASE=$vite_back_api_base >> .env && \
#   echo VITE_BACK_API_FS=$vite_back_api_fs >> .env && \
#   echo VITE_STORETOKEN_WAY=$vite_storetoken_way >> .env && \
#   echo VITE_TMW_REQUIRE_BUCKET=$vite_tmw_require_bucket >> .env && \
#   echo VITE_ENCRYPT_SECRET=$vite_encrypt_secret >> .env

## ue_admin安装依赖包
COPY ./packages/ue_admin/package.json /usr/src/tmw/ue_admin/package.json
RUN cd /usr/src/tmw/ue_admin && pnpm i --strict-peer-dependencies=false

## ue_plugin安装依赖包
COPY ./packages/ue_plugin/package.json /usr/src/tmw/ue_plugin/package.json
RUN cd /usr/src/tmw/ue_plugin && pnpm i --strict-peer-dependencies=false

## ue_admin
COPY ./packages/ue_admin /usr/src/tmw/ue_admin
ARG vite_admin_base_url
RUN echo VITE_BASE_URL=$vite_admin_base_url >> /usr/src/tmw/ue_admin/.env
RUN cd /usr/src/tmw/ue_admin && pnpm build
### 建立空的前端配置文件
RUN mkdir -p /usr/src/tfd/ue/dist/${vite_base_url:-admin} && echo '{}' >> /usr/src/tfd/ue/dist/${vite_base_url:-admin}/settings.json

## ue_plugin
COPY ./packages/ue_plugin /usr/src/tmw/ue_plugin
ARG vite_plugin_base_url
RUN echo VITE_BASE_URL=$vite_plugin_base_url >> /usr/src/tmw/ue_plugin/.env
RUN cd /usr/src/tmw/ue_plugin && pnpm build

# # 安装依赖包，构建代码
# RUN yarn && yarn build

# 标准基础镜像（部署阶段）
# FROM nginx:alpine

# # 设置时区
# RUN sed -i 's?http://dl-cdn.alpinelinux.org/?https://mirrors.aliyun.com/?' /etc/apk/repositories && \
#   apk add -U tzdata && \
#   cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
#   apk del tzdata

# # 修改配置文件
# ADD ./nginx.conf.template /etc/nginx/nginx.conf.template

# ADD ./start_nginx.sh /usr/local/bin/start_nginx.sh

# RUN chmod +x /usr/local/bin/start_nginx.sh

# # 将构建阶段代码放在指定位置
# COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# CMD ["start_nginx.sh"]


# 生成运行镜像
FROM node:18-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk update && apk add bash tzdata \
  && cp -r -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN apk add nginx gettext

# ue_plugin
COPY --from=builder /usr/src/tmw/ue_plugin/dist /usr/share/nginx/html

# ue_admin
COPY --from=builder /usr/src/tmw/ue_admin/dist /usr/share/nginx/html
COPY ./docker/ue_admin/nginx.conf.template /etc/nginx/nginx.conf.template
COPY ./docker/ue_admin/start_nginx.sh /usr/local/bin/start_nginx.sh
RUN chmod +x /usr/local/bin/start_nginx.sh

WORKDIR /usr/app/tmw

# 可以暴露的端口
EXPOSE 80

ENTRYPOINT ["start_nginx.sh"]
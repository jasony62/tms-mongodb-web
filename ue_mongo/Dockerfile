#基于alpine的nodejs基础镜像
FROM node:16.14.2-alpine3.15 AS builder
WORKDIR /usr/src/app
#Install dependencied of nodejs on alpine
RUN npm install -g cnpm --registry=https://registry.npm.taobao.org
#Install node_modules
COPY ./ue_mongo ./ue_mongo
COPY ./ue_comp ./ue_comp

# 生成.env文件
ARG vue_app_title=用户端
ARG vue_app_base_url
ARG vue_app_back_auth_base
ARG vue_app_back_auth_server
ARG vue_app_back_api_base
ARG vue_app_back_api_server
ARG vue_app_back_api_fs
ARG vue_app_front_doceditor_add
ARG vue_app_front_doceditor_modify
ARG vue_app_front_batcheditor
ARG vue_app_storetoken_way
ARG vue_app_pluginsub_names

RUN echo VUE_APP_TITLE=$vue_app_title > ./ue_mongo/.env && \
  echo VUE_APP_BASE_URL=$vue_app_base_url >> ./ue_mongo/.env && \
  echo VUE_APP_BACK_AUTH_BASE=$vue_app_back_auth_base >> ./ue_mongo/.env && \
  echo VUE_APP_BACK_AUTH_SERVER=$vue_app_back_auth_server >> ./ue_mongo/.env && \
  echo VUE_APP_BACK_API_BASE=$vue_app_back_api_base >> ./ue_mongo/.env && \
  echo VUE_APP_BACK_API_SERVER=$vue_app_back_api_server >> ./ue_mongo/.env && \
  echo VUE_APP_BACK_API_FS=$vue_app_back_api_fs >> ./ue_mongo/.env && \
  echo VUE_APP_FRONT_DOCEDITOR_ADD=$vue_app_front_doceditor_add >> ./ue_mongo/.env && \
  echo VUE_APP_FRONT_DOCEDITOR_MODIFY=$vue_app_front_doceditor_modify >> ./ue_mongo/.env && \ 
  echo VUE_APP_FRONT_BATCHEDITOR=$vue_app_front_batcheditor >> ./ue_mongo/.env && \
  echo VUE_APP_STORETOKEN_WAY=$vue_app_storetoken_way >> ./ue_mongo/.env && \
  echo VUE_APP_PLUGINSUB_NAMES=$vue_app_pluginsub_names >> ./ue_mongo/.env

# 安装依赖包，构建代码
RUN cd ue_mongo && cnpm i && yarn build

# 标准基础镜像（部署阶段）
FROM nginx:alpine

# 设置时区
RUN sed -i 's?http://dl-cdn.alpinelinux.org/?https://mirrors.aliyun.com/?' /etc/apk/repositories && \
  apk add -U tzdata && \
  cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  apk del tzdata

# 修改配置文件
ADD ./ue_mongo/nginx.conf.template /etc/nginx/nginx.conf.template

ADD ./ue_mongo/start_nginx.sh /usr/local/bin/start_nginx.sh

RUN chmod +x /usr/local/bin/start_nginx.sh

# 将构建阶段代码放在指定位置
COPY --from=builder /usr/src/app/ue_mongo/dist /usr/share/nginx/html

CMD ["start_nginx.sh"]


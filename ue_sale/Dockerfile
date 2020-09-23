# 标准基础镜像（构建阶段）
FROM node:alpine

RUN npm install cnpm -g

WORKDIR /home/node/app

COPY . .

# 生成.env文件
ARG vue_app_base_url
ARG vue_app_login_key_username=username
ARG vue_app_login_key_password=password
ARG vue_app_login_key_pin=pin
ARG vue_app_back_auth_base
ARG vue_app_back_auth_server
ARG vue_app_back_api_base
ARG vue_app_back_api_server
ARG vue_app_user_role
ARG vue_app_tags
ARG vue_app_default_tag

RUN echo VUE_APP_BASE_URL=$vue_app_base_url > .env && \
  echo VUE_APP_LOGIN_KEY_USERNAME=$vue_app_login_key_username >> .env && \
  echo VUE_APP_LOGIN_KEY_PASSWORD=$vue_app_login_key_password  >> .env && \
  echo VUE_APP_LOGIN_KEY_PIN=$vue_app_login_key_pin  >> .env && \
  echo VUE_APP_BACK_AUTH_BASE=$vue_app_back_auth_base >> .env && \
  echo VUE_APP_BACK_AUTH_SERVER=$vue_app_back_auth_server >> .env && \
  echo VUE_APP_BACK_API_BASE=$vue_app_back_api_base >> .env && \
  echo VUE_APP_BACK_API_SERVER=$vue_app_back_api_server >> .env && \
  echo VUE_APP_USER_ROLE=$vue_app_user_role >> .env && \
  echo VUE_APP_TAGS=$vue_app_tags >> .env && \
  echo VUE_APP_DEFAULT_TAG=$vue_app_default_tag >> .env

RUN cnpm i && yarn build.lib

# 标准基础镜像（部署阶段）
FROM nginx:alpine

# 设置时区
RUN sed -i 's?http://dl-cdn.alpinelinux.org/?https://mirrors.aliyun.com/?' /etc/apk/repositories && \
  apk add -U tzdata && \
  cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  apk del tzdata

# 修改配置文件
ADD nginx.conf.template /etc/nginx/nginx.conf.template

ADD start_nginx.sh start_nginx.sh

RUN chmod +x start_nginx.sh

# 将代码放在指定位置
COPY --from=0 /home/node/app/dist /usr/share/nginx/html

CMD ["./start_nginx.sh"]
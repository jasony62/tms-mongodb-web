# 开箱即用的tms-mongodb-web镜像

# 服务预编译
FROM node:16.15-alpine3.15 AS builder
# Install dependencied of nodejs on alpine
# RUN npm install -g cnpm --registry=https://artifact.srdcloud.cn/artifactory/api/npm/public-npm-virtual/
# RUN npm install -g cnpm --registry=https://regisry.npm.taobao.org
# Install node_modules
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
# RUN apk add git
RUN npm install -g pnpm

# 下载源代码
WORKDIR /usr/src
RUN cd /usr/src 
# RUN git clone -b dev https://github.com/jasony62/tms-mongodb-web.git tmw
# RUN git clone --depth=1 https://gitee.com/jasony62/tms-mongodb-web.git
COPY ../../back /usr/src/tmw/back 
COPY ../../ue_admin2 /usr/src/tmw/ue_admin2 

# 安装依赖报和编译
WORKDIR /usr/src/tmw
# back
RUN cd /usr/src/tmw/back && pnpm i --strict-peer-dependencies=false

# ue_admin2
WORKDIR /usr/src/tmw/ue_admin2
# 指定编译需要的环境变量
RUN echo VITE_BASE_URL=/admin >> .env
RUN echo VITE_BACK_API_BASE=http://localhost:3077/api >> .env
RUN echo VITE_BACK_AUTH_BASE=http://localhost:3077 >> .env
# 编译
RUN cd /usr/src/tmw/ue_admin2 && pnpm i --strict-peer-dependencies=false && pnpm build

# 生成服务镜像
FROM node:16.15-alpine3.15 
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk update && apk add bash tzdata \
  && cp -r -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN apk add nginx gettext

# ue_admin
COPY --from=builder /usr/src/tmw/ue_admin2/dist /usr/share/nginx/html/admin
COPY --from=builder /usr/src/tmw/ue_admin2/nginx.conf.template /etc/nginx/nginx.conf.template
COPY --from=builder /usr/src/tmw/ue_admin2/start_nginx.sh /usr/local/bin/start_nginx.sh
RUN chmod +x /usr/local/bin/start_nginx.sh

# back
WORKDIR /usr/app
COPY --from=builder /usr/src/tmw/back /usr/app
RUN chmod +x /usr/app/start_back.sh

EXPOSE 3000
EXPOSE 80

COPY ../../docker/standalone/start_all.sh /usr/local/bin/start_all.sh 
RUN chmod +x /usr/local/bin/start_all.sh 

CMD ["start_all.sh"]



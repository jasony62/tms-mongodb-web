# 开箱即用的tms-mongodb-web镜像

# 服务预编译
FROM node:16.15-alpine3.15 AS builder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 安装基础包
RUN npm install -g pnpm typescript

# 下载源代码
WORKDIR /usr/src
RUN cd /usr/src 
COPY ../../packages/tmw-model /usr/src/tmw/model
COPY ../../packages/tmw-back /usr/src/tmw/back
RUN sed -i 's/"tmw-model": "workspace:\*"/"tmw-model": "file:\.\.\/model"/g' /usr/src/tmw/back/package.json
COPY ../../ue_admin2 /usr/src/tmw/ue_admin2

# 安装依赖报和编译
WORKDIR /usr/src/tmw

## model 
RUN cd /usr/src/tmw/model && pnpm i --strict-peer-dependencies=false && pnpm build 

## back
RUN cd /usr/src/tmw/back && pnpm i --strict-peer-dependencies=false && pnpm build 

## ue_admin2
WORKDIR /usr/src/tmw/ue_admin2

# 指定编译ue_admin2需要的环境变量
RUN echo VITE_BASE_URL=/admin >> .env
RUN echo VITE_AUTH_API_BASE=http://host.docker.internal:3077/api >> .env
RUN echo VITE_BACK_AUTH_BASE=http://host.docker.internal:3077 >> .env

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
COPY --from=builder /usr/src/tmw/back/node_modules /usr/app/node_modules
COPY --from=builder /usr/src/tmw/back/dist /usr/app/dist
COPY --from=builder /usr/src/tmw/back/package.json /usr/app/package.json
RUN sed -i 's/"tmw-model": "file:\.\.\/model"/"tmw-model": "\*"/g' /usr/app/package.json
COPY ../../docker/allinone/back/start_back.sh /usr/app/start_back.sh
RUN chmod +x /usr/app/start_back.sh

EXPOSE 3000
EXPOSE 80

# all in one
COPY ../../docker/allinone/start_all.sh /usr/local/bin/start_all.sh 
RUN chmod +x /usr/local/bin/start_all.sh 

CMD ["start_all.sh"]



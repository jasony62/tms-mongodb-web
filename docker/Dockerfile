# 开箱即用的tms-mongodb-web镜像

# 服务预编译
FROM node:16.15-alpine3.15 AS builder
# Install dependencied of nodejs on alpine
# RUN npm install -g cnpm --registry=https://artifact.srdcloud.cn/artifactory/api/npm/public-npm-virtual/
# RUN npm install -g cnpm --registry=https://regisry.npm.taobao.org
# Install node_modules
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
RUN apk add git
RUN npm install -g pnpm

# 下载源代码
WORKDIR /usr/src
RUN cd /usr/src 
RUN git clone -b dev --depth=1 https://github.com/jasony62/tms-mongodb-web.git tmw
# RUN git clone --depth=1 https://gitee.com/jasony62/tms-mongodb-web.git

# 安装依赖报和编译
WORKDIR /usr/src/tmw
# # back
RUN cd /usr/src/tmw/back && pnpm i --strict-peer-dependencies=false

# ue_admin2
RUN cd /usr/src/tmw/ue_admin2 && pnpm i --strict-peer-dependencies=false && pnpm build

# # 生成服务镜像
# FROM node:16.15-alpine3.15 
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
#   && apk update && apk add bash tzdata \
#   && cp -r -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
# RUN apk add nginx

# # back
# WORKDIR /usr/app
# COPY --from=builder /usr/src/tmw /usr/app
# RUN mkdir -p /data/root && mkdir -p /data/upload
# EXPOSE 3000
# CMD [ "node", "./server.js" ]

# # ue_admin2
# COPY --from=builder /usr/src/tmw/ue_admin2/dist /usr/share/nginx/html
# COPY --from=builder /usr/src/tmw/ue_admin2/nginx.conf.template /etc/nginx/nginx.conf
# COPY --from=builder /usr/src/tmw/ue_admin2start_nginx.sh /usr/local/bin/start_nginx.sh
# RUN chmod +x /usr/local/bin/start_nginx.sh
# CMD ["start_nginx.sh"]


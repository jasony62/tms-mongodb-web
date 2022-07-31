# 开箱即用的tms-mongodb-web镜像

# 服务预编译
FROM node:16.15-alpine3.15 AS builder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 安装基础包
RUN npm install -g pnpm typescript

# 安装Python3，为安装sharp做准备
RUN apk add --update --no-cache py3-pip python3
# 解决sharp依赖的libvips包下载慢的问题
COPY ../docker/back/npmlibs/_libvips/libvips-8.12.2-linuxmusl-x64.tar.br /root/.npm/_libvips/libvips-8.12.2-linuxmusl-x64.tar.br

# 复制源代码
## kit
COPY ../packages/tmw-kit /usr/src/tmw/kit
RUN cd /usr/src/tmw/kit && pnpm i --strict-peer-dependencies=false && pnpm build 
### 去掉不必要的依赖包
RUN rm -rf /usr/src/tmw/kit/node_modules
RUN cd /usr/src/tmw/kit && pnpm i --production --strict-peer-dependencies=false

## back安装依赖包
COPY ../packages/tmw-back/package.json /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/back/package.json
RUN cd /usr/src/tmw/back && pnpm i --strict-peer-dependencies=false
## ue_admin安装依赖包
COPY ../packages/ue_admin/package.json /usr/src/tmw/ue_admin/package.json
RUN cd /usr/src/tmw/ue_admin && pnpm i --strict-peer-dependencies=false

# 编译源代码
## back
COPY ../packages/tmw-back /usr/src/tmw/back
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/back/package.json
RUN cd /usr/src/tmw/back && pnpm build 

### 去掉不必要的包，重新安装生产版本的包
RUN rm -rf /usr/src/tmw/back/node_modules
RUN cd /usr/src/tmw/back && pnpm i --production --strict-peer-dependencies=false
RUN cd /usr/src/tmw/back/node_modules/tmw-kit && pnpm i --production --strict-peer-dependencies=false

## ue_admin
COPY ../packages/ue_admin /usr/src/tmw/ue_admin
ARG vite_base_url
RUN echo VITE_BASE_URL=$vite_base_url >> /usr/src/tmw/ue_admin/.env
RUN cd /usr/src/tmw/ue_admin && pnpm build

# WORKDIR /usr/src/packages

# 生成运行镜像

FROM node:16.15-alpine3.15 
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk update && apk add bash tzdata \
  && cp -r -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN apk add nginx gettext

# ue_admin
COPY --from=builder /usr/src/tmw/ue_admin/dist /usr/share/nginx/html
COPY ../docker/ue_admin/nginx.conf.template /etc/nginx/nginx.conf.template
COPY ../docker/ue_admin/start_nginx.sh /usr/local/bin/start_nginx.sh
RUN chmod +x /usr/local/bin/start_nginx.sh

# back
COPY --from=builder /usr/src/tmw/back/node_modules /usr/app/tmw/node_modules
COPY --from=builder /usr/src/tmw/back/dist /usr/app/tmw/dist
COPY --from=builder /usr/src/tmw/back/package.json /usr/app/tmw/package.json
RUN sed -i 's/"tmw-kit": "file:\.\.\/kit"/"tmw-kit": "\*"/g' /usr/app/tmw/package.json
COPY ../docker/back/start_back.sh /usr/app/tmw/start_back.sh
RUN chmod +x /usr/app/tmw/start_back.sh

WORKDIR /usr/app/tmw

# 启动服务
COPY ../docker/start_all.sh /usr/local/bin/start_all.sh 
RUN chmod +x /usr/local/bin/start_all.sh 

# 配置文件
COPY ../docker/back/config /usr/app/tmw/config

CMD ["start_all.sh"]

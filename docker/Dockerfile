# 开箱即用的tms-mongodb-web镜像

# 服务预编译
FROM node:16.15-alpine3.15 AS builder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 修改npm源
RUN npm config set registry https://registry.npmmirror.com

# 安装基础包
RUN npm install --location=global pnpm typescript

# # 安装sharp包需要的工具
# RUN apk add python3 make
# # 解决sharp依赖的libvips包下载慢的问题
# COPY ../docker/back/npmlibs/_libvips/libvips-8.12.2-linuxmusl-x64.tar.br /root/.npm/_libvips/libvips-8.12.2-linuxmusl-x64.tar.br

# 复制源代码
## data
COPY ../packages/tmw-data /usr/src/tmw/data
RUN cd /usr/src/tmw/data && pnpm i --strict-peer-dependencies=false && pnpm build 
### 去掉不必要的依赖包
# RUN rm -rf /usr/src/tmw/data/node_modules
# RUN cd /usr/src/tmw/data && pnpm i --production --strict-peer-dependencies=false

## kit
COPY ../packages/tmw-kit /usr/src/tmw/kit
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/kit/package.json
RUN cd /usr/src/tmw/kit && pnpm i --strict-peer-dependencies=false && pnpm build 
# ### 去掉不必要的依赖包
# RUN rm -rf /usr/src/tmw/kit/node_modules
# RUN cd /usr/src/tmw/kit && pnpm i --production --strict-peer-dependencies=false

## plugin
COPY ../packages/plugins /usr/src/tmw/plugins
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/plugins/package.json
RUN cd /usr/src/tmw/plugins && pnpm i --strict-peer-dependencies=false && pnpm build 
### 去掉不必要的依赖包
# RUN rm -rf /usr/src/tmw/plugins/node_modules
# RUN cd /usr/src/tmw/plugins && pnpm i --production --strict-peer-dependencies=false

## back安装依赖包
COPY ../packages/tmw-back/package.json /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/back/package.json
RUN cd /usr/src/tmw/back && pnpm i --strict-peer-dependencies=false

## ue_admin安装依赖包
COPY ../packages/ue_admin/package.json /usr/src/tmw/ue_admin/package.json
RUN cd /usr/src/tmw/ue_admin && pnpm i --strict-peer-dependencies=false

## ue_plugin安装依赖包
COPY ../packages/ue_plugin/package.json /usr/src/tmw/ue_plugin/package.json
RUN cd /usr/src/tmw/ue_plugin && pnpm i --strict-peer-dependencies=false

# 编译源代码
## back
COPY ../packages/tmw-back /usr/src/tmw/back
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/back/package.json
RUN cd /usr/src/tmw/back && pnpm build 

### 去掉不必要的包，重新安装生产版本的包
# RUN rm -rf /usr/src/tmw/back/node_modules
RUN cd /usr/src/tmw/back && pnpm i --production --strict-peer-dependencies=false
# RUN cd /usr/src/tmw/back/node_modules/tmw-data && pnpm i --production --strict-peer-dependencies=false
# RUN cd /usr/src/tmw/back/node_modules/tmw-kit && pnpm i --production --strict-peer-dependencies=false

## ue_admin
COPY ../packages/ue_admin /usr/src/tmw/ue_admin
ARG vite_admin_base_url
RUN echo VITE_BASE_URL=$vite_admin_base_url >> /usr/src/tmw/ue_admin/.env
RUN cd /usr/src/tmw/ue_admin && pnpm build

## ue_plugin
COPY ../packages/ue_plugin /usr/src/tmw/ue_plugin
ARG vite_plugin_base_url
RUN echo VITE_BASE_URL=$vite_plugin_base_url >> /usr/src/tmw/ue_plugin/.env
RUN cd /usr/src/tmw/ue_plugin && pnpm build

# 生成运行镜像
FROM node:16.15-alpine3.15 
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk update && apk add bash tzdata \
  && cp -r -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN apk add nginx gettext

# ue_plugin
COPY --from=builder /usr/src/tmw/ue_plugin/dist /usr/share/nginx/html

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

# plugins
COPY --from=builder /usr/src/tmw/plugins/dist /usr/app/tmw/plugins/dist
COPY --from=builder /usr/src/tmw/plugins/node_modules /usr/app/tmw/plugins/node_modules

WORKDIR /usr/app/tmw

# 启动服务
COPY ../docker/start_all.sh /usr/local/bin/start_all.sh 
RUN chmod +x /usr/local/bin/start_all.sh 

# 配置文件
COPY ../docker/back/config /usr/app/tmw/config

ENTRYPOINT ["start_all.sh"]

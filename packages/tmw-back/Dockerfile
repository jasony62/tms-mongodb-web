# 服务预编译
FROM node:18-alpine AS builder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 修改npm源
RUN npm config set registry https://registry.npmmirror.com

# 安装基础包
RUN npm install --location=global pnpm typescript

# 复制源代码
## data
COPY ./packages/tmw-data /usr/src/tmw/data
RUN cd /usr/src/tmw/data && pnpm i --strict-peer-dependencies=false && pnpm build 
### 去掉不必要的依赖包
# RUN rm -rf /usr/src/tmw/data/node_modules
# RUN cd /usr/src/tmw/data && pnpm i --production --strict-peer-dependencies=false

## kit
COPY ./packages/tmw-kit /usr/src/tmw/kit
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/kit/package.json
RUN cd /usr/src/tmw/kit && pnpm i --strict-peer-dependencies=false && pnpm build 
# ### 去掉不必要的依赖包
# RUN rm -rf /usr/src/tmw/kit/node_modules
# RUN cd /usr/src/tmw/kit && pnpm i --production --strict-peer-dependencies=false

## plugin
COPY ./packages/plugins /usr/src/tmw/plugins
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/plugins/package.json
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/plugins/package.json
RUN cd /usr/src/tmw/plugins && pnpm i --strict-peer-dependencies=false && pnpm build 
### 去掉不必要的依赖包
# RUN rm -rf /usr/src/tmw/plugins/node_modules
# RUN cd /usr/src/tmw/plugins && pnpm i --production --strict-peer-dependencies=false

## back安装依赖包
COPY ./packages/tmw-back/package.json /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/back/package.json
### 不单独安装better-sqlite3会失败
RUN cd /usr/src/tmw/back && pnpm i --strict-peer-dependencies=false

# 编译源代码（先安装包再编译是为了提高效率）
## back
COPY ./packages/tmw-back /usr/src/tmw/back
RUN sed -i 's/"tmw-data": "workspace:\*"/"tmw-data": "file:\.\.\/data"/g' /usr/src/tmw/back/package.json
RUN sed -i 's/"tmw-kit": "workspace:\*"/"tmw-kit": "file:\.\.\/kit"/g' /usr/src/tmw/back/package.json
RUN cd /usr/src/tmw/back && pnpm build 

### 去掉不必要的包，重新安装生产版本的包
# RUN rm -rf /usr/src/tmw/back/node_modules
RUN cd /usr/src/tmw/back && pnpm i --production --strict-peer-dependencies=false
# RUN cd /usr/src/tmw/back/node_modules/tmw-data && pnpm i --production --strict-peer-dependencies=false
# RUN cd /usr/src/tmw/back/node_modules/tmw-kit && pnpm i --production --strict-peer-dependencies=false

# 生成运行镜像
FROM node:18-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk update && apk add bash tzdata \
  && cp -r -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN apk add nginx gettext

# back
COPY --from=builder /usr/src/tmw/back/node_modules /usr/app/tmw/node_modules
COPY --from=builder /usr/src/tmw/back/dist /usr/app/tmw/dist
COPY --from=builder /usr/src/tmw/back/package.json /usr/app/tmw/package.json
RUN sed -i 's/"tmw-kit": "file:\.\.\/kit"/"tmw-kit": "\*"/g' /usr/app/tmw/package.json
COPY ./docker/back/start_back.sh /usr/app/tmw/start_back.sh
RUN chmod +x /usr/app/tmw/start_back.sh

# 配置文件
COPY ./docker/back/config /usr/app/tmw/config

WORKDIR /usr/app/tmw

EXPOSE 3000

ENTRYPOINT ["/usr/app/tmw/start_back.sh"]
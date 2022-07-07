在一个容器中运行整个应用（不包含 mongodb，redis 等中间件）。

# 构造镜像

在项目根目录执行命令。

```shell
docker build -f ./docker/allinone/Dockerfile -t tms/tmw-aio .
```

# 运行镜像

```shell
docker run -it --rm --name tmw-test -p 3077:3000 -p 7077:80 -v $PWD/docker/allinone/back/config:/usr/app/config --env-file ./docker/allinone/sample.env tms/tmw-aio
```

```shell
docker run -it --rm --name tmw-test -p 3077:3000 -p 7077:80 -e NGINX_BACK_BASE_URL=http://localhost:3000 tms/tmw-aio
```

# 指定配置文件

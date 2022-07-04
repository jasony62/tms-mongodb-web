在一个容器中运行整个应用（不包含mongodb，redis等中间件）。

# 构造镜像

在项目根目录执行命令。

```shell
docker build -f ./docker/standalone/Dockerfile -t tms/tmw-sa .
```

# 运行镜像

```shell
docker run -it --rm --name tmw-test -p 3077:3000 -p 7077:80 -v $PWD/docker/standalone/back/config:/usr/app/config --env-file ./docker/standalone/sample.env tms/tmw-sa
```

```shell
docker run -it --rm --name tmw-test -p 3077:3000 -p 7077:80 -e NGINX_BACK_BASE_URL=http://localhost:3000 tms/tmw-sa
```

# 指定配置文件

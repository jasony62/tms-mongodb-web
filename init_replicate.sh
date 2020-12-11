#!/bin/sh

# 复制配置文件到容器中
# docker cp ./init_replicate.js tms-mongodb-mongo:/home/int_replicate.js

# 按照配置文件初始化复制集
# docker exec -it tms-mongodb-mongo mongo --port 37017 /home/int_replicate.js

# 配置复制集
docker exec -it tms-mongodb-mongo sh /home/init_replicate.sh
```
version: '3.7'
services:
  mongodb:
    build: ./mongodb
    image: tms-mongodb/mongo:latest
    container_name: tms-mongodb-mongo
    networks:
      - tms-mongodb
    volumes:
      - ./customMongodb/customData:/data/db
    ports:
      - '27017:27017'
    logging:
      driver: 'none'

  back:
    build: ./back
    image: tms-mongodb/back:latest
    container_name: tms-mongodb-back
    environment:
      #   默认
      - NODE_ENV=production
      #   app 名称
      - TMS_APP_NAME=tms-mongo-web
      #   app 端口号
      - TMS_APP_PORT=3000
      #   导入文件存放目录
      - TMS_FINDER_FS_ROOTDIR=/storage
      #   导出文件存放目录
      - TMS_FINDER_FS_OUTDIR=/storage
      #   是否使用文件自身命名
      - TMS_FINDER_FS_CUSTOMNAME=true
      #   日志输出级别
      - TMS_APP_LOG4JS_LEVEL=debug
      #   默认鉴权方式
      - TMS_APP_AUTH_TYPE=jwt
      #   mongodb 配置，根据实际参数配置
      - TMS_MONGODB_HOST=mongodb
      - TMS_MONGODB_PORT=27017
      - TMS_MONGODB_USER=root
      - TMS_MONGODB_PASSWORD=root
    #   redis 配置，根据实际参数配置。若开启jwt机制则可不用配置此处
    # - TMS_REDIS_PREFIX=dev-op
    # - TMS_REDIS_HOST=host.docker.internal
    # - TMS_REDIS_PORT=6379
    # - TMS_REDIS_EXPIRESIN=7200
    #    - TMS_REDIS_PWD=
    #   swagger 配置
    #   - TMW_API_HOST=http://back
    #   - TMW_API_PORT=3000
    #   bucket
    #   - TMW_REQUIRE_BUCKET=
    #   复制集：开启实时复制
    #    - TMW_REALTIME_REPLICA=true
    #    - TMW_REPLICA_SET_NAME=tmw-rA_s
    #    - TMW_MONGODB_S_PORT=27018
    #    - TMW_MONGODB_A_PORT=27019
    #    - TMS_MONGODB_S_HOST=
    #    - TMS_MONGODB_A_HOST=
    networks:
      - tms-mongodb
    command:
      [
        'sh',
        './wait-for.sh',
        'mongodb:27017',
        '-t',
        '300',
        '--',
        'node',
        'server',
      ]
    ports:
      - '3000:3000'

  ue_admin:
    build:
      context: .
      dockerfile: Dockerfile-ueadmin
      args:
        vue_app_login_key_username: username
        vue_app_login_key_password: password
        vue_app_login_key_pin: pin
        vue_app_base_url: /admin
        vue_app_back_auth_base: /auth
        vue_app_back_api_base: /api
        vue_app_back_api_fs: /fs
        vue_app_front_doceditor_add: ''
        vue_app_front_doceditor_modify: ''
        vue_app_storetoken_way: session
        vue_app_back_auth_server: http://back:3000
        vue_app_back_api_server: http://back:3000
    image: tms-mongodb/ue-admin:latest
    container_name: tms-mongodb-ue_admin
    environment:
      # - NGINX_BACK_BASE_URL=http://back:3000
      - NGINX_WEB_BASE_URL=/admin
      # # 定义连接基数区域，10m 可以储存 320000 个并发会话
      # - NGINX_LIMIT_CONN_ZONE=10m
      # # 是限制每个IP只能发起8000个并发连接
      # - NGINX_LIMIT_CONN_CONNIP=8000
      # # 指定当触发limit的时候日志打印级别
      # - NGINX_LIMIT_CONN_LOG_LEVEL=error
      # # 回复被禁用的连接请求时的状态码
      - NGINX_LIMIT_CONN_STATUS=488
    # # 达到阀值后开始限速(字节)
    # - NGINX_LIMIT_RATE_AFTER=300m
    # # 限制向客户端传输数据的速度(Byte/s)
    # - NGINX_LIMIT_RATE=300k
    # # 指定等待client发送一个包体的超时时间
    # - NGINX_CLIENT_BODY_TIMEOUT=60s
    # # 指定等待client发送一个包头的超时时间
    # - NGINX_CLIENT_HEADER_TIMEOUT=60s
    # # keep-alive连接超时时间
    # - NGINX_KEEPALIVE_TIMEOUT=75s
    # # 服务端向客户端传输数据的超时时间
    # - NGINX_SEND_TIMEOUT=60s
    # # 隐藏版本号
    # - NGINX_SERVER_TOKENS=off
    networks:
      - tms-mongodb
    ports:
      - '3840:80'

  ue_mongo:
    build:
      context: .
      dockerfile: Dockerfile-uemongo
      args:
        vue_app_login_key_username: username
        vue_app_login_key_password: password
        vue_app_login_key_pin: pin
        vue_app_base_url: /mongo
        vue_app_back_auth_base: /auth
        vue_app_back_api_base: /api
        vue_app_back_api_fs: /fs
        vue_app_front_doceditor_add: ''
        vue_app_front_doceditor_modify: ''
        vue_app_front_batcheditor: ''
        vue_app_storetoken_way: session
        vue_app_pluginsub_names: ''
        vue_app_back_auth_server: http://back:3000
        vue_app_back_api_server: http://back:3000
    image: tms-mongodb/ue-mongo:latest
    container_name: tms-mongodb-ue_mongo
    environment:
      # - NGINX_BACK_BASE_URL=http://back:3000
      - NGINX_WEB_BASE_URL=/mongo
      # # 定义连接基数区域，10m 可以储存 320000 个并发会话
      # - NGINX_LIMIT_CONN_ZONE=10m
      # # 是限制每个IP只能发起8000个并发连接
      # - NGINX_LIMIT_CONN_CONNIP=8000
      # # 指定当触发limit的时候日志打印级别
      # - NGINX_LIMIT_CONN_LOG_LEVEL=error
      # # 回复被禁用的连接请求时的状态码
      - NGINX_LIMIT_CONN_STATUS=488
    # # 达到阀值后开始限速(字节)
    # - NGINX_LIMIT_RATE_AFTER=300m
    # # 限制向客户端传输数据的速度(Byte/s)
    # - NGINX_LIMIT_RATE=300k
    # # 指定等待client发送一个包体的超时时间
    # - NGINX_CLIENT_BODY_TIMEOUT=60s
    # # 指定等待client发送一个包头的超时时间
    # - NGINX_CLIENT_HEADER_TIMEOUT=60s
    # # keep-alive连接超时时间
    # - NGINX_KEEPALIVE_TIMEOUT=75s
    # # 服务端向客户端传输数据的超时时间
    # - NGINX_SEND_TIMEOUT=60s
    # # 隐藏版本号
    # - NGINX_SERVER_TOKENS=off
    networks:
      - tms-mongodb
    ports:
      - '3830:80'

networks:
  tms-mongodb:
    driver: bridge
```

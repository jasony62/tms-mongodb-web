TMW_REPLICA_SET_NAME=${TMW_REPLICA_SET_NAME:-tmw-rs}
TMW_MONGODB_PORT=${TMW_MONGODB_PORT:-37017}
TMW_MONGODB_S_PORT=${TMW_MONGODB_S_PORT:-37018}
TMW_MONGODB_A_PORT=${TMW_MONGODB_A_PORT:-37019}

# 根据环境变量生成配置文件
envsubst < /home/init_replicate.js.template > /home/init_replicate.js

# 执行初始化操作
mongo --port $TMW_MONGODB_PORT /home/init_replicate.js

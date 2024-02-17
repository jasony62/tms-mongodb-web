#!/bin/sh

# 后端推送服务端口（默认不打开推动端口）
export UE_SETTINGS_BACK_PUSH_PORT=${UE_SETTINGS_BACK_PUSH_PORT:-\-1}

# 生成默认的前端设置文件
envsubst '$UE_SETTINGS_BACK_PUSH_PORT' < /usr/share/nginx/html/admin/settings.json.template > /usr/share/nginx/html/admin/settings.json

# 启动nginx服务
nohup /usr/local/bin/start_nginx.sh &>/dev/null &

# 启动后台服务
/usr/app/tmw/start_back.sh
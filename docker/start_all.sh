#!/bin/sh

# 检查是否已经存在settings.json文件，若无，根据环境变量生成默认文件
SETTINGS_FILE="/usr/share/nginx/html/admin/settings.json"  
if [ ! -f "$SETTINGS_FILE" ]; then  
  # 后端推送服务端口（默认不打开推动端口）
  export UE_SETTINGS_BACK_PUSH_PORT=${UE_SETTINGS_BACK_PUSH_PORT:-\-1}
  # 生成默认的前端设置文件
  envsubst '$UE_SETTINGS_BACK_PUSH_PORT' < /usr/share/nginx/html/admin/settings.json.template > /usr/share/nginx/html/admin/settings.json
  
  echo "根据环境变量，自动生成settings.json文件"
fi

# 启动nginx服务
nohup /usr/local/bin/start_nginx.sh &>/dev/null &

# 启动后台服务
/usr/app/tmw/start_back.sh
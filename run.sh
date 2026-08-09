#!/bin/bash

# 获取脚本所在目录，确保无论从何处执行，PID文件和日志路径都正确
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

#####################################################
# 后端服务：tmw-back
#####################################################
TMW_BACK_DIR="$SCRIPT_DIR/packages/tmw-back"
TMW_BACK_PID_FILE="$TMW_BACK_DIR/tmw-back.pid"

tmw_back_start() {
    if [ -f "$TMW_BACK_PID_FILE" ] && kill -0 "$(cat "$TMW_BACK_PID_FILE")" 2>/dev/null; then
        echo "[tmw-back] Already running (PID $(cat "$TMW_BACK_PID_FILE"))"
        return 1
    fi
    cd "$TMW_BACK_DIR" || { echo "[tmw-back] Directory not found: $TMW_BACK_DIR"; return 1; }
    nohup pnpm start > tmw-back.log 2>&1 &
    echo $! > "$TMW_BACK_PID_FILE"
    echo "[tmw-back] Started (PID $!)"
}

tmw_back_stop() {
    if [ ! -f "$TMW_BACK_PID_FILE" ]; then
        echo "[tmw-back] Not running (no pid file)"
        return 1
    fi
    PID=$(cat "$TMW_BACK_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        for i in $(seq 1 5); do
            kill -0 "$PID" 2>/dev/null || break
            sleep 1
        done
        kill -0 "$PID" 2>/dev/null && kill -9 "$PID"
        echo "[tmw-back] Stopped"
    else
        echo "[tmw-back] Process already dead, cleaning up pid file"
    fi
    rm -f "$TMW_BACK_PID_FILE"
}

tmw_back_status() {
    if [ -f "$TMW_BACK_PID_FILE" ] && kill -0 "$(cat "$TMW_BACK_PID_FILE")" 2>/dev/null; then
        echo "[tmw-back] Running (PID $(cat "$TMW_BACK_PID_FILE"))"
    else
        echo "[tmw-back] Not running"
    fi
}

#####################################################
# 前端服务：ue_admin
#####################################################
UE_ADMIN_DIR="$SCRIPT_DIR/packages/ue_admin"
UE_ADMIN_PID_FILE="$UE_ADMIN_DIR/ue_admin.pid"

ue_admin_start() {
    if [ -f "$UE_ADMIN_PID_FILE" ] && kill -0 "$(cat "$UE_ADMIN_PID_FILE")" 2>/dev/null; then
        echo "[ue_admin] Already running (PID $(cat "$UE_ADMIN_PID_FILE"))"
        return 1
    fi
    cd "$UE_ADMIN_DIR" || { echo "[ue_admin] Directory not found: $UE_ADMIN_DIR"; return 1; }
    nohup pnpm dev > ue_admin.log 2>&1 &
    echo $! > "$UE_ADMIN_PID_FILE"
    echo "[ue_admin] Started (PID $!)"
}

ue_admin_stop() {
    if [ ! -f "$UE_ADMIN_PID_FILE" ]; then
        echo "[ue_admin] Not running (no pid file)"
        return 1
    fi
    PID=$(cat "$UE_ADMIN_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        for i in $(seq 1 5); do
            kill -0 "$PID" 2>/dev/null || break
            sleep 1
        done
        kill -0 "$PID" 2>/dev/null && kill -9 "$PID"
        echo "[ue_admin] Stopped"
    else
        echo "[ue_admin] Process already dead, cleaning up pid file"
    fi
    rm -f "$UE_ADMIN_PID_FILE"
}

ue_admin_status() {
    if [ -f "$UE_ADMIN_PID_FILE" ] && kill -0 "$(cat "$UE_ADMIN_PID_FILE")" 2>/dev/null; then
        echo "[ue_admin] Running (PID $(cat "$UE_ADMIN_PID_FILE"))"
    else
        echo "[ue_admin] Not running"
    fi
}

#####################################################
# 全部服务（先 tmw-back，再 ue_admin）
#####################################################
all_start() {
    echo "=== Starting all services ==="
    tmw_back_start
    sleep 2  # 等待后端初始化
    ue_admin_start
}

all_stop() {
    echo "=== Stopping all services ==="
    ue_admin_stop   # 先停前端
    tmw_back_stop   # 再停后端
}

all_status() {
    tmw_back_status
    ue_admin_status
}

all_restart() {
    all_stop
    sleep 1
    all_start
}

tmw_back_restart() {
    tmw_back_stop
    sleep 1
    tmw_back_start
}

ue_admin_restart() {
    ue_admin_stop
    sleep 1
    ue_admin_start
}

#####################################################
# 主入口
#####################################################
ACTION="$1"
SERVICE="${2:-all}"  # 未指定时默认 all

case "$ACTION" in
    start|stop|status|restart)
        case "$SERVICE" in
            tmw-back|back)
                "tmw_back_${ACTION}"
                ;;
            ue_admin|admin|front)
                "ue_admin_${ACTION}"
                ;;
            all)
                "all_${ACTION}"
                ;;
            *)
                echo "Unknown service: $SERVICE"
                echo "Usage: $0 {start|stop|status|restart} [tmw-back|ue_admin|all]"
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart} [tmw-back|ue_admin|all]"
        echo ""
        echo "Examples:"
        echo "  $0 start                 # 启动所有服务（先后端再前端）"
        echo "  $0 start tmw-back        # 仅启动后端"
        echo "  $0 start ue_admin        # 仅启动前端"
        echo "  $0 stop                  # 停止所有服务（先前端的再停后端）"
        echo "  $0 stop tmw-back         # 仅停止后端"
        echo "  $0 stop ue_admin         # 仅停止前端"
        echo "  $0 restart               # 重启所有服务"
        echo "  $0 restart tmw-back      # 仅重启后端"
        echo "  $0 restart ue_admin      # 仅重启前端"
        echo "  $0 status                # 查看所有服务状态"
        exit 1
        ;;
esac
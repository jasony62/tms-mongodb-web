#!/bin/bash

# =============================================================================
# 项目名称: TMW-AIO Docker 管理脚本
# 描述: 封装 Docker 构建与 Compose 启动命令（MongoDB 专用）
# =============================================================================

set -e

# ----------------------------- 配置区 ---------------------------------------
IMAGE_NAME="jasony62/tmw-aio"
IMAGE_DEV_NAME="jasony62/tmw-aio_dev"
DOCKERFILE_PROD="./docker/Dockerfile"
DOCKERFILE_DEV="./docker/Dockerfile.dev"

COMPOSE_DIR="./docker"
COMPOSE_FILES="-f ${COMPOSE_DIR}/docker-compose.yml -f ${COMPOSE_DIR}/docker-compose.mongodb.yml"
PROJECT_NAME="tms-mongodb-web"
SERVICE_NAME="tmw-aio"

# ⚠️ 请根据 docker-compose.mongodb.yml 中实际服务名确认
MG_SERVICE_NAME="mongodb"
# ---------------------------------------------------------------------------

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
    cat <<EOF
用法: $0 <命令> [选项]

可用命令:
  build       构建生产镜像 (${IMAGE_NAME})
  build-dev   构建开发基础镜像 (${IMAGE_DEV_NAME})
  up          仅启动应用服务
  up-all      启动应用 + MongoDB
  mg-up       仅启动 MongoDB (${MG_SERVICE_NAME})
  mg-down     仅停止 MongoDB
  down        停止并移除所有服务
  restart     重启应用服务
  logs        查看日志 (默认应用, 可指定服务名)
  status      查看所有服务状态
  help        显示此帮助信息

示例:
  $0 up-all              # 启动应用 + MongoDB
  $0 mg-up               # 仅启动 MongoDB
  $0 mg-down             # 仅停止 MongoDB
  $0 logs mongodb -f     # 查看 MongoDB 实时日志
EOF
}

# ----------------------------- 内部工具函数 ----------------------------------

_run_compose() {
    docker compose --project-directory "${COMPOSE_DIR}" ${COMPOSE_FILES} -p "${PROJECT_NAME}" "$@"
}

# ----------------------------- 命令实现 -------------------------------------

cmd_build() {
    info "正在构建生产镜像: ${IMAGE_NAME}"
    docker build -f "${DOCKERFILE_PROD}" -t "${IMAGE_NAME}" .
    info "✅ 生产镜像构建完成: ${IMAGE_NAME}"
}

cmd_build_dev() {
    info "正在构建开发基础镜像: ${IMAGE_DEV_NAME}"
    docker build -f "${DOCKERFILE_DEV}" -t "${IMAGE_DEV_NAME}" .
    info "✅ 开发基础镜像构建完成: ${IMAGE_DEV_NAME}"
}

cmd_up() {
    info "正在启动应用服务: ${SERVICE_NAME}"
    _run_compose up -d "${SERVICE_NAME}"
    info "✅ 应用服务已启动"
    _run_compose ps
}

cmd_up_all() {
    info "正在启动应用 + MongoDB..."
    _run_compose up -d "${MG_SERVICE_NAME}" "${SERVICE_NAME}"
    info "✅ 应用 + MongoDB 已启动"
    _run_compose ps
}

cmd_mg_up() {
    info "正在启动 MongoDB: ${MG_SERVICE_NAME}"
    _run_compose up -d "${MG_SERVICE_NAME}"
    info "✅ MongoDB 已启动"
    _run_compose ps "${MG_SERVICE_NAME}"
}

cmd_mg_down() {
    info "正在停止 MongoDB: ${MG_SERVICE_NAME}"
    _run_compose stop "${MG_SERVICE_NAME}"
    info "✅ MongoDB 已停止"
}

cmd_down() {
    info "正在停止所有服务: ${PROJECT_NAME}"
    _run_compose down
    info "✅ 所有服务已停止"
}

cmd_restart() {
    info "正在重启应用服务: ${SERVICE_NAME}"
    _run_compose restart "${SERVICE_NAME}"
    info "✅ 应用服务已重启"
}

cmd_logs() {
    local target="${1:-${SERVICE_NAME}}"
    shift 2>/dev/null || true
    _run_compose logs "${target}" "$@"
}

cmd_status() {
    _run_compose ps
}

# ----------------------------- 主入口 ---------------------------------------

if [ $# -lt 1 ]; then
    usage
    exit 1
fi

COMMAND="$1"
shift

case "${COMMAND}" in
    build)      cmd_build ;;
    build-dev)  cmd_build_dev ;;
    up)         cmd_up ;;
    up-all)     cmd_up_all ;;
    mg-up)      cmd_mg_up ;;
    mg-down)    cmd_mg_down ;;
    down)       cmd_down ;;
    restart)    cmd_restart ;;
    logs)       cmd_logs "$@" ;;
    status)     cmd_status ;;
    help|--help|-h) usage ;;
    *)
        error "未知命令: ${COMMAND}"
        usage
        exit 1
        ;;
esac
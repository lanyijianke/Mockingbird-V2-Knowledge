#!/bin/bash
# ──────────────────────────────────────────────────
# DB SSH Tunnel Manager
# 本地 3307 → server-149 → 远程 MySQL 3306
# ──────────────────────────────────────────────────

SSH_KEY="$HOME/.ssh/id_server149"
SSH_HOST="149.88.65.19"
SSH_PORT="1501"
SSH_USER="grank"
LOCAL_PORT="3307"
REMOTE_HOST="127.0.0.1"
REMOTE_PORT="3306"

PID_FILE="/tmp/mockingbird-db-tunnel.pid"

is_alive() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

start() {
  if is_alive; then
    echo "隧道已在运行 (PID: $(cat "$PID_FILE"))"
    return 0
  fi

  # 确保本地端口没被占
  if lsof -i :"$LOCAL_PORT" -sTCP:LISTEN &>/dev/null; then
    echo "端口 $LOCAL_PORT 已被占用，尝试清理..."
    lsof -ti :"$LOCAL_PORT" | xargs kill -9 2>/dev/null
    sleep 1
  fi

  ssh -i "$SSH_KEY" -f -N \
    -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
    -p "$SSH_PORT" \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    "${SSH_USER}@${SSH_HOST}"

  # 拿到 ssh 后台进程 PID
  local pid
  pid=$(lsof -ti :"$LOCAL_PORT" -sTCP:LISTEN 2>/dev/null | head -1)
  if [ -n "$pid" ]; then
    echo "$pid" > "$PID_FILE"
    echo "隧道已建立 (PID: $pid)  本地 :${LOCAL_PORT} → ${SSH_HOST}:${REMOTE_PORT}"
  else
    echo "隧道建立失败" >&2
    return 1
  fi
}

stop() {
  if is_alive; then
    local pid
    pid=$(cat "$PID_FILE")
    kill "$pid" 2>/dev/null
    rm -f "$PID_FILE"
    echo "隧道已关闭 (PID: $pid)"
  else
    echo "隧道未在运行"
  fi
}

status() {
  if is_alive; then
    echo "隧道运行中 (PID: $(cat "$PID_FILE"))  本地 :${LOCAL_PORT} → ${SSH_HOST}:${REMOTE_PORT}"
    # 快速验证 MySQL 连通性
    if nc -z -w 2 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
      echo "MySQL 端口可达 ✓"
    else
      echo "MySQL 端口不可达 ✗"
    fi
  else
    echo "隧道未运行"
  fi
}

case "${1:-}" in
  start)   start   ;;
  stop)    stop    ;;
  restart) stop; sleep 1; start ;;
  status)  status  ;;
  *)
    echo "用法: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

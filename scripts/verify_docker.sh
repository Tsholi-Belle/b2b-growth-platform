#!/usr/bin/env bash
# ==============================================================================
# ArchEngine Solutions — Automated Docker Production Artifact Verification Script
# Checks image build, single-container startup, health check, UI & API routing
# ==============================================================================

set -euo pipefail

IMAGE_NAME="archengine-production-test:v3"
CONTAINER_NAME="archengine-docker-verify"
TEST_PORT="3099"

echo "=== ArchEngine Solutions — Docker Production Artifact Verification ==="

if ! command -v docker &> /dev/null; then
    echo "[SKIP] Docker CLI not installed in current environment. Manual verification required."
    exit 0
fi

echo "[1/5] Building production Docker image (${IMAGE_NAME})..."
docker build --no-cache -t "${IMAGE_NAME}" -f Dockerfile .

echo "[2/5] Starting container on port ${TEST_PORT}..."
docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${TEST_PORT}:3001" \
  -e SINGLE_CONTAINER=true \
  -e NODE_ENV=production \
  -e APP_MODE=demo \
  "${IMAGE_NAME}"

echo "Waiting for container initialization..."
sleep 4

echo "[3/5] Verifying /health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TEST_PORT}/health")
if [ "${HEALTH_STATUS}" -eq 200 ]; then
    echo "  ✓ /health endpoint returned HTTP 200 OK"
else
    echo "  ✕ /health endpoint returned HTTP ${HEALTH_STATUS}"
    docker logs "${CONTAINER_NAME}"
    docker rm -f "${CONTAINER_NAME}" || true
    exit 1
fi

echo "[4/5] Verifying / (Frontend UI) endpoint..."
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TEST_PORT}/")
if [ "${UI_STATUS}" -eq 200 ]; then
    echo "  ✓ / UI endpoint returned HTTP 200 OK"
else
    echo "  ✕ / UI endpoint returned HTTP ${UI_STATUS}"
    docker rm -f "${CONTAINER_NAME}" || true
    exit 1
fi

echo "[5/5] Verifying API authentication failure handling..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TEST_PORT}/api/proposals")
if [ "${AUTH_STATUS}" -eq 401 ]; then
    echo "  ✓ Unauthenticated /api/proposals returned HTTP 401 Unauthorized"
else
    echo "  ✕ Unauthenticated /api/proposals returned HTTP ${AUTH_STATUS}"
    docker rm -f "${CONTAINER_NAME}" || true
    exit 1
fi

echo "Cleaning up container..."
docker rm -f "${CONTAINER_NAME}" > /dev/null

echo "=== DOCKER VERIFICATION PASSED SUCCESSFULLY ==="

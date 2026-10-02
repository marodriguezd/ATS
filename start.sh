#!/bin/bash
# ATS Resume Suite Start Script

echo "🚀 Iniciando ATS Resume Suite..."

# Activate virtualenv and start backend
./backend/venv/bin/uvicorn app.main:app --app-dir ./backend --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
pnpm --prefix frontend dev &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "🛑 Deteniendo ATS Resume Suite..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup INT TERM

echo ""
echo "✅ Sistema iniciado con éxito:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://127.0.0.1:8000"
echo "   - Documentación OpenAPI: http://127.0.0.1:8000/docs"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios."

wait

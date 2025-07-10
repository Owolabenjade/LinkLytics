#!/bin/bash

echo "Starting LinkLytics Development Environment..."

# Check services
echo "Checking PostgreSQL..."
sudo service postgresql status > /dev/null || sudo service postgresql start

echo "Checking Redis..."
sudo service redis-server status > /dev/null || sudo service redis-server start

# Start backend
echo "Starting backend server..."
cd backend && node server.js &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Start frontend
echo "Starting frontend server..."
cd ../frontend && npm start &
FRONTEND_PID=$!

echo ""
echo "🚀 LinkLytics is starting up!"
echo "Backend PID: $BACKEND_PID (http://localhost:5000)"
echo "Frontend PID: $FRONTEND_PID (http://localhost:3000)"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
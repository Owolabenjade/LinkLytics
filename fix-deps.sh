#!/bin/bash

echo "Fixing LinkLytics dependencies..."

# Backend
echo "Installing backend dependencies..."
cd backend
npm install express cors helmet morgan compression dotenv bcryptjs jsonwebtoken pg pg-hstore sequelize redis ioredis express-rate-limit express-validator axios useragent qrcode
npm install --save-dev nodemon jest supertest eslint

# Frontend
echo "Installing frontend dependencies..."
cd ../frontend
npm install react react-dom react-scripts axios react-router-dom chart.js react-chartjs-2 tailwindcss @tailwindcss/forms react-hot-toast date-fns lucide-react

echo "Dependencies installed!"

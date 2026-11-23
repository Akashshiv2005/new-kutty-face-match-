#!/bin/bash
set -e

cd /var/www/kutty-story

echo "Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "Installing backend dependencies..."
cd backend
venv/bin/pip install -r requirements.txt

echo "Running database migrations..."
venv/bin/alembic upgrade head

echo "Building frontend..."
cd ../frontend
npm ci
npm run build

echo "Fixing permissions..."
chown -R www-data:www-data /var/www/kutty-story/frontend/dist

echo "Restarting backend..."
systemctl restart kutty-story.service

echo "Checking backend..."
sleep 3
systemctl is-active --quiet kutty-story.service

echo "Deployment completed successfully!"

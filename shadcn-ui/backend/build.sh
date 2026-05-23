#!/usr/bin/env bash
# exit on error
set -o errexit

echo "📦 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🔧 Initializing database..."
python init_db.py

echo "✅ Build completed!"
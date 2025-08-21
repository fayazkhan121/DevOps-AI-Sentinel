#!/bin/bash

# DevOps AI Sentinel - Startup Script
# This script helps you quickly set up and run the platform

set -e

echo "DevOps AI Sentinel - Enterprise Monitoring & Alerting Platform"
echo "================================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please upgrade Node.js to continue."
    exit 1
fi

echo "SUCCESS: Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed. Please install npm first."
    exit 1
fi

echo "SUCCESS: npm $(npm -v) detected"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "INSTALLING: Installing dependencies..."
    npm install
    echo "SUCCESS: Dependencies installed successfully"
else
    echo "SUCCESS: Dependencies already installed"
fi

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "CONFIG: Creating environment configuration file..."
    cat > .env << EOF
# DevOps AI Sentinel Environment Configuration

# Database Configuration (default: IndexedDB)
DATABASE_TYPE=indexeddb
# DATABASE_TYPE=postgresql
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=devops_user
# DATABASE_PASSWORD=secure_password
# DATABASE_NAME=devops_sentinel

# Cloud Provider Credentials
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_REGION=us-east-1

# Azure Configuration
# AZURE_TENANT_ID=your-tenant-id
# AZURE_CLIENT_ID=your-client-id
# AZURE_CLIENT_SECRET=your-client-secret
# AZURE_SUBSCRIPTION_ID=your-subscription-id

# GCP Configuration
# GCP_PROJECT_ID=your-project-id
# GCP_KEY_FILE=path/to/service-account-key.json

# Security Configuration
JWT_SECRET=devops-sentinel-jwt-secret-change-in-production
ENCRYPTION_KEY=devops-sentinel-encryption-key-change-in-production

# Notification Configuration
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Slack Configuration
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Development Configuration
NODE_ENV=development
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
EOF
    echo "SUCCESS: Environment file created (.env)"
    echo "   Please review and update the configuration as needed"
fi

# Check if .env.local exists for local overrides
if [ ! -f ".env.local" ]; then
    echo ""
    echo "INFO: Create a .env.local file for local-only configuration overrides"
fi

echo ""
echo "QUICK START OPTIONS:"
echo "1. Start development server (recommended for first time)"
echo "2. Build and start production server"
echo "3. Run tests"
echo "4. Exit"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "STARTING: Development server..."
        echo "   The application will be available at: http://localhost:5173"
        echo "   Press Ctrl+C to stop the server"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "BUILDING: Production build..."
        npm run build
        
        echo ""
        echo "STARTING: Production server..."
        echo "   The application will be available at: http://localhost:4173"
        echo "   Press Ctrl+C to stop the server"
        echo ""
        npm run preview
        ;;
    3)
        echo ""
        echo "TESTING: Running tests..."
        npm run test
        ;;
    4)
        echo ""
        echo "EXIT: Goodbye! Run this script again when you're ready to start."
        exit 0
        ;;
    *)
        echo "ERROR: Invalid option. Please run the script again."
        exit 1
        ;;
esac 
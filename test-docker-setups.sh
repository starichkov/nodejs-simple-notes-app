#!/bin/bash

# Test script for Docker Compose setups
# Usage: ./test-docker-setups.sh [couchdb|mongodb|both]
# 
# NOTE: This script automatically sets test credentials for database access.
# In production, you must create your own .env file with secure credentials.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to test API endpoints
test_api() {
    local db_type=$1
    
    print_status "Testing API endpoints for $db_type..."
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    health_response=$(curl -s http://localhost:3000/health)
    if [[ "$health_response" == *'"status":"ok"'* ]]; then
        print_success "Health check passed"
    else
        print_error "Health check failed: $health_response"
        return 1
    fi
    
    # Test creating a note
    print_status "Creating a test note..."
    create_response=$(curl -s -X POST http://localhost:3000/api/notes \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Test Note for $db_type\",\"content\":\"This is a test note created during automated testing\"}")
    
    if [[ "$create_response" == *'"id"'* ]]; then
        print_success "Note created successfully"
        note_id=$(echo "$create_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_status "Created note ID: $note_id"
    else
        print_error "Failed to create note: $create_response"
        return 1
    fi
    
    # Test retrieving all notes
    print_status "Retrieving all notes..."
    get_all_response=$(curl -s http://localhost:3000/api/notes)
    if [[ "$get_all_response" == *'"id"'* ]]; then
        print_success "Successfully retrieved notes"
        note_count=$(echo "$get_all_response" | grep -o '"id"' | wc -l)
        print_status "Found $note_count note(s)"
    else
        print_error "Failed to retrieve notes: $get_all_response"
        return 1
    fi
    
    # Test web UI
    print_status "Testing web UI..."
    ui_response=$(curl -s http://localhost:3000/)
    if [[ "$ui_response" == *"<title>Notes App</title>"* ]]; then
        print_success "Web UI is accessible"
    else
        print_error "Web UI is not accessible"
        return 1
    fi
    
    print_success "All API tests passed for $db_type!"
}

# Function to test CouchDB setup
test_couchdb() {
    print_status "Starting CouchDB setup..."
    
    # Set test credentials for CouchDB
    local couchdb_env="COUCHDB_USERNAME=test_admin COUCHDB_PASSWORD=test_password_123 COUCHDB_DATABASE=test_notes_db"
    
    eval "$couchdb_env docker compose -f docker-compose.couchdb.yml up --build -d"
    
    wait_for_service "http://localhost:5984" "CouchDB"
    wait_for_service "http://localhost:3000/health" "Notes App (CouchDB)"
    
    test_api "CouchDB"
    
    print_status "Container status:"
    eval "$couchdb_env docker compose -f docker-compose.couchdb.yml ps"
    
    print_status "Stopping CouchDB setup..."
    eval "$couchdb_env docker compose -f docker-compose.couchdb.yml down"
    
    print_success "CouchDB test completed successfully!"
}

# Function to test MongoDB setup
test_mongodb() {
    print_status "Starting MongoDB setup..."
    
    # Set test credentials for MongoDB
    local mongodb_env="MONGODB_USERNAME=test_user MONGODB_PASSWORD=test_password_456 MONGODB_DATABASE=test_notes_db"
    
    eval "$mongodb_env docker compose -f docker-compose.mongodb.yml up --build -d"
    
    wait_for_service "http://localhost:3000/health" "Notes App (MongoDB)"
    
    test_api "MongoDB"
    
    print_status "Container status:"
    eval "$mongodb_env docker compose -f docker-compose.mongodb.yml ps"
    
    print_status "Stopping MongoDB setup..."
    eval "$mongodb_env docker compose -f docker-compose.mongodb.yml down -v"
    
    print_success "MongoDB test completed successfully!"
}

# Main script logic
case "${1:-both}" in
    "couchdb")
        test_couchdb
        ;;
    "mongodb")
        test_mongodb
        ;;
    "both")
        test_couchdb
        echo ""
        test_mongodb
        ;;
    *)
        print_error "Usage: $0 [couchdb|mongodb|both]"
        exit 1
        ;;
esac

print_success "All tests completed successfully!"
print_status "You can now use either setup:"
print_status "  For CouchDB: docker compose -f docker-compose.couchdb.yml up -d"
print_status "  For MongoDB: docker compose -f docker-compose.mongodb.yml up -d"
print_status "  Access the app at: http://localhost:3000" 
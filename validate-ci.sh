#!/bin/bash

# CI Validation Script
# This script validates GitHub Actions workflows and Docker Compose setups locally
# Usage: ./validate-ci.sh [quick|full|workflows-only]

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate GitHub Actions workflow syntax
validate_workflows() {
    print_status "Validating GitHub Actions workflows..."
    
    if command -v gh >/dev/null 2>&1; then
        print_status "Using GitHub CLI to validate workflows..."
        
        for workflow in .github/workflows/*.yml; do
            if [ -f "$workflow" ]; then
                print_status "Validating $(basename "$workflow")..."
                
                # Check workflow syntax using GitHub CLI
                gh_output=$(gh workflow view "$(basename "$workflow")" 2>&1)
                gh_exit_code=$?
                
                if [ $gh_exit_code -eq 0 ]; then
                    print_success "✅ $(basename "$workflow") syntax is valid (GitHub CLI)"
                elif echo "$gh_output" | grep -q "gh auth login"; then
                    print_warning "⚠️  GitHub CLI not authenticated, falling back to YAML validation"
                    # Fallback to basic YAML validation
                    if command -v yq >/dev/null 2>&1; then
                        # Try different yq syntaxes (mikefarah vs python version)
                        if yq eval . "$workflow" >/dev/null 2>&1; then
                            print_success "✅ $(basename "$workflow") YAML syntax is valid (yq mikefarah)"
                        elif yq . "$workflow" >/dev/null 2>&1; then
                            print_success "✅ $(basename "$workflow") YAML syntax is valid (yq python)"
                        else
                            print_error "❌ $(basename "$workflow") has invalid YAML syntax"
                            return 1
                        fi
                    else
                        print_warning "Install 'yq' for YAML validation"
                    fi
                else
                    print_warning "⚠️  Could not validate $(basename "$workflow") with GitHub CLI: $gh_output"
                    # Fallback to basic YAML validation
                    if command -v yq >/dev/null 2>&1; then
                        # Try different yq syntaxes (mikefarah vs python version)
                        if yq eval . "$workflow" >/dev/null 2>&1; then
                            print_success "✅ $(basename "$workflow") YAML syntax is valid (yq mikefarah)"
                        elif yq . "$workflow" >/dev/null 2>&1; then
                            print_success "✅ $(basename "$workflow") YAML syntax is valid (yq python)"
                        else
                            print_error "❌ $(basename "$workflow") has invalid YAML syntax"
                            return 1
                        fi
                    else
                        print_warning "Install 'yq' for better YAML validation"
                    fi
                fi
            fi
        done
    else
        print_warning "GitHub CLI not found. Install 'gh' for better workflow validation"
        
        # Basic YAML validation
        if command -v yq >/dev/null 2>&1; then
            for workflow in .github/workflows/*.yml; do
                if [ -f "$workflow" ]; then
                    print_status "Basic YAML validation for $(basename "$workflow")..."
                    # Try different yq syntaxes (mikefarah vs python version)
                    if yq eval . "$workflow" >/dev/null 2>&1; then
                        print_success "✅ $(basename "$workflow") YAML syntax is valid (yq mikefarah)"
                    elif yq . "$workflow" >/dev/null 2>&1; then
                        print_success "✅ $(basename "$workflow") YAML syntax is valid (yq python)"
                    else
                        print_error "❌ $(basename "$workflow") has invalid YAML syntax"
                        return 1
                    fi
                fi
            done
        else
            print_warning "Install 'yq' for YAML validation"
        fi
    fi
    
    print_success "GitHub Actions workflow validation completed"
}

# Function to validate Docker Compose files
validate_docker_compose() {
    print_status "Validating Docker Compose files..."
    
    # Set temporary credentials for validation
    export MONGODB_USERNAME="validation_user"
    export MONGODB_PASSWORD="validation_password"
    export MONGODB_DATABASE="validation_db"
    export COUCHDB_USERNAME="validation_admin"
    export COUCHDB_PASSWORD="validation_password"
    export COUCHDB_DATABASE="validation_db"
    
    for compose_file in docker-compose.*.yml; do
        if [ -f "$compose_file" ]; then
            print_status "Validating $compose_file..."
            
            # Check compose file syntax
            if docker compose -f "$compose_file" config >/dev/null 2>&1; then
                print_success "✅ $compose_file syntax is valid"
            else
                print_error "❌ $compose_file has invalid syntax"
                print_status "Running detailed validation..."
                docker compose -f "$compose_file" config || true
                return 1
            fi
            
            # Check for required environment variables
            print_status "Checking required environment variables for $compose_file..."
            if grep -q "MONGODB" "$compose_file"; then
                missing_vars=()
                for var in MONGODB_USERNAME MONGODB_PASSWORD MONGODB_DATABASE; do
                    if ! grep -q "$var" "$compose_file"; then
                        missing_vars+=("$var")
                    fi
                done
                if [ ${#missing_vars[@]} -eq 0 ]; then
                    print_success "✅ All MongoDB environment variables are referenced"
                else
                    print_warning "⚠️  Missing MongoDB variables: ${missing_vars[*]}"
                fi
            fi
            
            if grep -q "COUCHDB" "$compose_file"; then
                missing_vars=()
                for var in COUCHDB_USERNAME COUCHDB_PASSWORD COUCHDB_DATABASE; do
                    if ! grep -q "$var" "$compose_file"; then
                        missing_vars+=("$var")
                    fi
                done
                if [ ${#missing_vars[@]} -eq 0 ]; then
                    print_success "✅ All CouchDB environment variables are referenced"
                else
                    print_warning "⚠️  Missing CouchDB variables: ${missing_vars[*]}"
                fi
            fi
        fi
    done
    
    print_success "Docker Compose validation completed"
}

# Function to test Docker Compose setups locally
test_docker_setups() {
    print_status "Testing Docker Compose setups locally..."
    
    if [ ! -f "test-docker-setups.sh" ]; then
        print_error "test-docker-setups.sh not found"
        return 1
    fi
    
    chmod +x test-docker-setups.sh
    
    print_status "Running quick validation tests..."
    
    # Test with minimal credentials (just syntax validation)
    export MONGODB_USERNAME="test_user"
    export MONGODB_PASSWORD="test_password"
    export MONGODB_DATABASE="test_db"
    export COUCHDB_USERNAME="test_admin"
    export COUCHDB_PASSWORD="test_password"
    export COUCHDB_DATABASE="test_db"
    
    # Test that compose files can be parsed with credentials
    for db in mongodb couchdb; do
        print_status "Testing $db compose file with credentials..."
        if docker compose -f "docker-compose.$db.yml" config >/dev/null 2>&1; then
            print_success "✅ docker-compose.$db.yml works with test credentials"
        else
            print_error "❌ docker-compose.$db.yml failed with test credentials"
            return 1
        fi
    done
    
    print_success "Local Docker Compose setup validation completed"
}

# Function to run full integration tests
run_full_tests() {
    print_status "Running full integration tests..."
    
    if [ ! -f "test-docker-setups.sh" ]; then
        print_error "test-docker-setups.sh not found"
        return 1
    fi
    
    # Set unique test credentials
    export MONGODB_USERNAME="ci_test_user_$(date +%s)"
    export MONGODB_PASSWORD="ci_test_password_$(openssl rand -hex 16)"
    export MONGODB_DATABASE="ci_test_db"
    export COUCHDB_USERNAME="ci_test_admin_$(date +%s)"
    export COUCHDB_PASSWORD="ci_test_password_$(openssl rand -hex 16)"
    export COUCHDB_DATABASE="ci_test_db"
    
    print_status "Testing MongoDB setup..."
    if ./test-docker-setups.sh mongodb; then
        print_success "✅ MongoDB integration test passed"
    else
        print_error "❌ MongoDB integration test failed"
        return 1
    fi
    
    print_status "Testing CouchDB setup..."
    if ./test-docker-setups.sh couchdb; then
        print_success "✅ CouchDB integration test passed"
    else
        print_error "❌ CouchDB integration test failed"
        return 1
    fi
    
    print_success "Full integration tests completed"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        print_success "✅ Docker is installed: $(docker --version)"
    else
        print_error "❌ Docker is not installed"
        return 1
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        print_success "✅ Docker Compose is available: $(docker compose version)"
    else
        print_error "❌ Docker Compose is not available"
        return 1
    fi
    
    # Check if Docker daemon is running
    if docker info >/dev/null 2>&1; then
        print_success "✅ Docker daemon is running"
    else
        print_error "❌ Docker daemon is not running"
        return 1
    fi
    
    # Optional tools
    for tool in yq jq gh curl; do
        if command -v "$tool" >/dev/null 2>&1; then
            print_success "✅ $tool is available"
        else
            print_warning "⚠️  $tool is not installed (optional but recommended)"
        fi
    done
    
    print_success "Prerequisites check completed"
}

# Function to display usage
usage() {
    echo "Usage: $0 [quick|full|workflows-only]"
    echo ""
    echo "Options:"
    echo "  quick         - Validate workflows and compose files only (default)"
    echo "  full          - Run full integration tests"
    echo "  workflows-only - Validate GitHub Actions workflows only"
    echo ""
    echo "Examples:"
    echo "  $0              # Quick validation"
    echo "  $0 full         # Full integration tests"
    echo "  $0 workflows-only # Just workflow validation"
}

# Main execution
main() {
    local mode="${1:-quick}"
    
    echo "🔍 CI Validation Script"
    echo "======================="
    echo ""
    
    case "$mode" in
        "quick")
            check_prerequisites
            validate_workflows
            validate_docker_compose
            test_docker_setups
            print_success "🎉 Quick validation completed successfully!"
            ;;
        "full")
            check_prerequisites
            validate_workflows
            validate_docker_compose
            run_full_tests
            print_success "🎉 Full validation completed successfully!"
            ;;
        "workflows-only")
            validate_workflows
            print_success "🎉 Workflow validation completed successfully!"
            ;;
        "-h"|"--help"|"help")
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $mode"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 
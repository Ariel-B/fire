.PHONY: test test-backend test-frontend test-e2e test-e2e-headed test-all test-coverage screenshots build clean help

help:
	@echo "FIRE Planning Tool - Test Commands"
	@echo "=================================="
	@echo ""
	@echo "make test              - Run all tests (both backend and frontend)"
	@echo "make test-backend      - Run C# xUnit tests only"
	@echo "make test-frontend     - Run JavaScript Jest tests only"
	@echo "make test-e2e          - Run Playwright end-to-end tests"
	@echo "make test-e2e-headed   - Run Playwright end-to-end tests in headed mode"
	@echo "make test-all          - Run all tests with coverage"
	@echo "make test-coverage     - Run tests and generate coverage reports"
	@echo "make screenshots       - Regenerate docs screenshots"
	@echo "make build             - Build the solution"
	@echo "make clean             - Clean build artifacts"
	@echo ""

test: test-backend test-frontend

test-backend:
	@echo "Running backend tests (xUnit)..."
	dotnet test fire.sln --configuration Debug

test-frontend:
	@echo "Running frontend tests (Jest)..."
	npm test

test-e2e:
	@echo "Running end-to-end tests (Playwright)..."
	npm run test:e2e

test-e2e-headed:
	@echo "Running end-to-end tests (Playwright headed)..."
	npm run test:e2e:headed

test-all:
	@echo "Running all tests (backend + frontend)..."
	npm run test:all

test-coverage:
	@echo "Running tests with coverage..."
	@echo ""
	@echo "Backend Coverage:"
	mkdir -p artifacts/coverage/backend
	dotnet test fire.sln /p:CollectCoverage=true /p:CoverageFormat=opencover /p:CoverletOutput=./artifacts/coverage/backend/coverage.opencover.xml
	@echo ""
	@echo "Frontend Coverage:"
	npm run test:coverage
	@echo ""
	@echo "Backend coverage artifact: artifacts/coverage/backend/coverage.opencover.xml"
	@echo "Frontend coverage report: artifacts/coverage/frontend/index.html"

screenshots:
	@echo "Regenerating documentation screenshots..."
	npm run screenshots

build:
	@echo "Building solution..."
	dotnet build fire.sln

clean:
	@echo "Cleaning build artifacts..."
	dotnet clean fire.sln
	rm -rf bin obj
	rm -rf tests/backend/FirePlanningTool.Tests/bin tests/backend/FirePlanningTool.Tests/obj
	rm -rf artifacts node_modules
	@echo "Clean complete"

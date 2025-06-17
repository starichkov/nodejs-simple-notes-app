[![Author](https://img.shields.io/badge/Author-Vadim%20Starichkov-blue?style=for-the-badge)](https://github.com/starichkov)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/starichkov/nodejs-simple-notes-app/node.js.yml?style=for-the-badge)](https://github.com/starichkov/nodejs-simple-notes-app/actions/workflows/node.js.yml)
[![Codecov](https://img.shields.io/codecov/c/github/starichkov/nodejs-simple-notes-app?style=for-the-badge)](https://codecov.io/gh/starichkov/nodejs-simple-notes-app)
[![GitHub License](https://img.shields.io/github/license/starichkov/nodejs-simple-notes-app?style=for-the-badge)](https://github.com/starichkov/nodejs-simple-notes-app/blob/main/LICENSE.md)

Notes API: Node.js with Express and NoSQL Databases
=

A RESTful API for managing text notes, built with Node.js, Express, and NoSQL databases. The application follows a database-agnostic architecture, allowing for easy switching between database vendors (currently supports CouchDB and MongoDB).

## 👨‍💻 Author

**Vadim Starichkov** | [GitHub](https://github.com/starichkov) | [LinkedIn](https://www.linkedin.com/in/vadim-starichkov/)

*Created as part of a modern Node.js development practices demonstration*

## Features

- Create, read, update, and delete text notes
- **Recycle bin functionality** - Move notes to recycle bin instead of immediate deletion
- **Restore notes** from recycle bin or permanently delete them
- RESTful API design
- Simple and intuitive web UI with tabs for Notes and Recycle Bin
- Database-agnostic architecture
- Multiple database implementations (CouchDB, MongoDB)
- Environment-based configuration
- Easy switching between database vendors

## Architecture

The application follows a layered architecture with a clear separation of concerns:

1. **Model Layer**: Database-agnostic data models
2. **Repository Layer**: Interface for data access with specific implementations
3. **API Layer**: Express routes for handling HTTP requests

This design allows for easy switching between database vendors by implementing a new repository that adheres to the repository interface.

## Prerequisites

These are the versions this sample app is coming with:

- Node.js (v22.16 or higher)
- npm or pnpm
- One of the following databases:
  - CouchDB (v3.4.3 or higher)
  - MongoDB (v7.0.21 or higher)

Stable work on lower versions is not guaranteed.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/starichkov/nodejs-simple-notes-app.git
   cd nodejs-simple-notes-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following content:
   ```
   # Database Vendor Selection (couchdb or mongodb)
   DB_VENDOR=couchdb

   # CouchDB Configuration
   COUCHDB_URL=http://admin:password@localhost:5984
   COUCHDB_DB_NAME=notes_db

   # MongoDB Configuration
   MONGODB_URL=mongodb://localhost:27017
   MONGODB_DB_NAME=notes_db

   # Server Configuration
   HOST=0.0.0.0
   PORT=3000
   ```
   Adjust the values according to your environment. Set `DB_VENDOR` to either `couchdb` or `mongodb` to select the database vendor.

## Docker Compose Setup

The application includes separate Docker Compose configurations for easy deployment with different database backends. This is the recommended way to run the application locally for development and testing.

### Available Configurations

- **docker-compose.couchdb.yml**: Runs the application with CouchDB
- **docker-compose.mongodb.yml**: Runs the application with MongoDB

### ⚠️ Required: Database Credentials Configuration

**IMPORTANT**: For security reasons, this application requires explicit database credentials. No default passwords are provided.

You **must** create a `.env` file with your own secure credentials before running any Docker Compose setup:

```bash
# Copy the template file
cp env.template .env

# Edit the .env file with your own secure credentials
# The .env file is automatically ignored by git for security
```

Required `.env` file content:
```env
# MongoDB Configuration (all required)
MONGODB_USERNAME=your_mongodb_user
MONGODB_PASSWORD=your_secure_mongodb_password
MONGODB_DATABASE=your_notes_database

# CouchDB Configuration (all required)
COUCHDB_USERNAME=your_couchdb_user
COUCHDB_PASSWORD=your_secure_couchdb_password
COUCHDB_DATABASE=your_notes_database
```

**Security Notes:**
- Use strong, unique passwords
- Never use default credentials like `admin/password`
- Keep your `.env` file secure and never commit it to version control
- The application will fail to start if any credentials are missing

### Running with CouchDB

```bash
# Start the application with CouchDB
docker compose -f docker-compose.couchdb.yml up -d

# Stop the application
docker compose -f docker-compose.couchdb.yml down
```

### Running with MongoDB

```bash
# Start the application with MongoDB
docker compose -f docker-compose.mongodb.yml up -d

# Stop the application
docker compose -f docker-compose.mongodb.yml down
```

### Services Included

Each Docker Compose setup includes:

- **Database service**: Either CouchDB (port 5984) or MongoDB (port 27017)
- **Notes application**: The Node.js API server (port 3000)
- **Health checks**: Automatic health monitoring for both services
- **Data persistence**: Named volumes for database data
- **Network isolation**: Services communicate through a private network

### Local Testing

Run the following command to execute tests and get a coverage report:

```shell
npm run test:coverage
```

Then open report file from `coverage/lcov-report/index.html`.

Or, alternatively, use an existing custom script:

```shell
npm run test:coverage:open
```

### Automated Testing

#### Local Testing Script

A test script is provided to validate both setups:

```bash
# Make the script executable (first time only)
chmod +x test-docker-setups.sh

# Test both database setups
./test-docker-setups.sh

# Test only CouchDB setup
./test-docker-setups.sh couchdb

# Test only MongoDB setup
./test-docker-setups.sh mongodb
```

#### CI/CD Validation

Before committing changes, validate your setup locally:

```bash
# Quick validation (recommended before commits)
./validate-ci.sh quick

# Full integration tests
./validate-ci.sh full

# GitHub Actions workflow validation only
./validate-ci.sh workflows-only
```

#### GitHub Actions CI

Our simple CI pipeline automatically:
- 🧪 **Runs unit tests** with coverage reporting
- 🔧 **Tests both database backends** (CouchDB and MongoDB) with Docker Compose
- ⚡ **Provides fast feedback** (~6-8 minutes total)
- 🛡️ **Uses secure credentials** (generated per test run)

**Single Workflow**:
- **Build**: Unit tests + coverage → Docker Compose tests (parallel)
- **Triggers**: PRs and pushes to main branch
- **Simple & Fast**: Essential testing only, no complexity

See [GITHUB_ACTIONS.md](https://github.com/starichkov/nodejs-simple-notes-app/blob/main/GITHUB_ACTIONS.md) for detailed CI documentation.

#### Test Features

The test scripts will:
- Start the specified database setup
- Wait for services to be healthy
- Test all API endpoints (health, CRUD operations)
- Verify the web UI is accessible
- Clean up by stopping the services

### Accessing the Application

Once started with either setup, the application will be available at:
- **Web UI**: http://localhost:3000
- **API**: http://localhost:3000/api/notes
- **Health Check**: http://localhost:3000/health

## Running the Application

Start the server:
```
npm start
```

The server will be available at http://localhost:3000.

Once the server is running, you can:
- Access the web UI by opening http://localhost:3000 in your browser
- Use the API endpoints directly with tools like curl, Postman, or your own client

## API Endpoints

### Get all active notes
```
GET /api/notes
```

### Get all deleted notes
```
GET /api/notes/recycle-bin
```

Note: The `/api/notes/trash` endpoint is still available for backward compatibility but is deprecated.

### Get a note by ID
```
GET /api/notes/:id
```

### Create a new note
```
POST /api/notes
Content-Type: application/json

{
  "title": "Note Title",
  "content": "Note content goes here"
}
```

### Update a note
```
PUT /api/notes/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

### Move a note to recycle bin (soft delete)
```
DELETE /api/notes/:id
```

### Restore a note from recycle bin
```
POST /api/notes/:id/restore
```

### Permanently delete a note
```
DELETE /api/notes/:id/permanent
```

### Get count of notes in recycle bin
```
GET /api/notes/recycle-bin/count
```

### Empty recycle bin (permanently delete all notes in recycle bin)
```
DELETE /api/notes/recycle-bin
```

### Restore all notes from recycle bin
```
POST /api/notes/recycle-bin/restore-all
```

## Health Check

```
GET /health
```

## Web UI

The application includes a simple and intuitive web UI for managing notes. The UI is accessible at the root URL of the application:

```
http://localhost:3000/
```

### UI Features

- **Tab Navigation**: Switch between "Notes" and "Recycle Bin" views
- **Notes View**: View all active notes in a responsive grid layout
- **Recycle Bin View**: View deleted notes with restore/permanently delete options
- Create new notes with a modal form
- Edit existing notes
- **Recycle Bin Operations**:
  - Move notes to recycle bin (soft delete) with confirmation
  - Restore notes from recycle bin back to active status
  - Permanently delete notes from recycle bin (with strong confirmation)
- Responsive design that works on desktop and mobile devices

The UI is built with vanilla JavaScript, HTML, and CSS, with no external dependencies. It communicates with the API endpoints described above.

## Switching Database Vendors

The application is designed to easily switch between database vendors. Currently, it supports CouchDB and MongoDB.

### Using Environment Variables

The simplest way to switch between database vendors is to change the `DB_VENDOR` environment variable in your `.env` file:

```
# To use CouchDB
DB_VENDOR=couchdb

# To use MongoDB
DB_VENDOR=mongodb
```

The application will automatically use the appropriate repository implementation based on this setting.

### Adding a New Database Vendor

To add support for a new database vendor:

1. Create a new repository implementation that extends the `NoteRepository` class
2. Implement all required methods (findAll, findById, create, update, delete)
3. Update the server initialization in `notes-api-server.js` to use the new repository

Example of adding a new repository implementation:

```javascript
// 1. Create a new repository file (e.g., src/db/new-vendor-note-repository.js)
import { NoteRepository } from './note-repository.js';
import { Note } from '../models/note.js';

export class NewVendorNoteRepository extends NoteRepository {
    // Implement all required methods
}

// 2. Update notes-api-server.js to use the new repository
import { NewVendorNoteRepository } from './db/new-vendor-note-repository.js';

// In the repository selection code:
if (DB_VENDOR === 'new-vendor') {
    noteRepository = new NewVendorNoteRepository(NEW_VENDOR_URL, NEW_VENDOR_DB_NAME);
}
```

## 📄 License & Attribution

This project is licensed under the **MIT License** - see the [LICENSE](https://github.com/starichkov/nodejs-simple-notes-app/blob/main/LICENSE.md) file for details.

### Using This Project?

If you use this code in your own projects, attribution is required under the MIT License:

```
Based on nodejs-simple-notes-app by Vadim Starichkov, TemplateTasks

https://github.com/starichkov/nodejs-simple-notes-app
```

**Copyright © 2025 Vadim Starichkov, TemplateTasks**

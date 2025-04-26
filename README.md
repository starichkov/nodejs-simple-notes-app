# Notes API - Node.js with Express and NoSQL Databases

A RESTful API for managing text notes, built with Node.js, Express, and NoSQL databases. The application follows a database-agnostic architecture, allowing for easy switching between database vendors (currently supports CouchDB and MongoDB).

## Features

- Create, read, update, and delete text notes
- RESTful API design
- Simple and intuitive web UI
- Database-agnostic architecture
- Multiple database implementations (CouchDB, MongoDB)
- Environment-based configuration
- Easy switching between database vendors

## Architecture

The application follows a layered architecture with clear separation of concerns:

1. **Model Layer**: Database-agnostic data models
2. **Repository Layer**: Interface for data access with specific implementations
3. **API Layer**: Express routes for handling HTTP requests

This design allows for easy switching between database vendors by implementing a new repository that adheres to the repository interface.

## Prerequisites

- Node.js (v14 or higher)
- npm or pnpm
- One of the following databases:
  - CouchDB (v3.0 or higher)
  - MongoDB (v4.0 or higher)

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

### Get all notes
```
GET /api/notes
```

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

### Delete a note
```
DELETE /api/notes/:id
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

- View all notes in a responsive grid layout
- Create new notes with a modal form
- Edit existing notes
- Delete notes with confirmation
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

## License

See the [LICENSE](LICENSE.md) file for license rights and limitations (MIT).

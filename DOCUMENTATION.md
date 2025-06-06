# Documentation Guide

This project uses **JSDoc** for generating comprehensive API documentation from code comments.

## Viewing Documentation

### Online Documentation
After running the documentation generation, open `docs/index.html` in your browser to view the complete API documentation.

### Quick Start
```bash
# Generate documentation
npm run docs

# Generate documentation and watch for changes
npm run docs:watch

# Serve documentation locally
npm run docs:serve

# Check documentation coverage and quality
node scripts/check-docs-coverage.js

# Version documentation for releases
npm run docs:version

# Complete release workflow (build + version)
npm run release:docs
```

### Viewing Documentation
```bash
# Local viewing (after generation)
open docs/index.html                    # macOS
xdg-open docs/index.html               # Linux

# Local server (recommended for development)
npm run docs:serve                     # Serves at http://localhost:8080
```

## Documentation Structure

The generated documentation includes:

- **Classes**: All major classes with detailed method documentation
- **Global**: API routes and standalone functions (see explanation below)
- **Examples**: Code examples showing how to use the API
- **Type Information**: Parameter and return types for all methods
- **Error Handling**: Information about exceptions that methods can throw

### Understanding the "Global" Section

The **Global** section contains:

#### **🌐 API Routes Documentation:**
- All REST API endpoints (`GET /notes`, `POST /notes`, etc.)
- Complete with request/response examples
- HTTP status codes and error conditions
- Perfect reference for API consumers

#### **🔧 Standalone Functions:**
- `createNotesRouter` - Factory function for Express routes
- Utility functions not tied to specific classes

**Why are API routes in Global?**
- JSDoc treats `@name` tagged route documentation as standalone items
- This creates a **centralized API reference** that's easy to navigate
- Alternative to having routes scattered across different module sections

## Key Classes Documented

### Core Classes
- **`NotesServer`** - Main server class for managing the application lifecycle
- **`Note`** - Data model representing a note
- **`NoteRepository`** - Abstract base class for data access

### Database Implementations
- **`CouchDbNoteRepository`** - CouchDB implementation
- **`MongoDbNoteRepository`** - MongoDB implementation

### API Routes
- **Global Section** - Complete REST API documentation with examples

## Writing JSDoc Comments

### Basic Structure
```javascript
/**
 * Brief description of the function/class
 * 
 * @param {type} paramName - Parameter description
 * @returns {type} Return value description
 * @throws {Error} When error conditions occur
 * @example
 * // Usage example
 * const result = functionName(param);
 */
```

### Common JSDoc Tags Used

- `@param {type} name - description` - Documents parameters
- `@returns {type} description` - Documents return values
- `@throws {Error} condition` - Documents exceptions
- `@example` - Provides usage examples
- `@class` - Marks a constructor function as a class
- `@extends` - Documents class inheritance
- `@name` - Creates named documentation entries (used for API routes)

### API Route Documentation
For API endpoints, we use a special pattern:
```javascript
/**
 * @name GET /notes
 * @description Retrieve all notes from the database
 * @route GET /
 * @returns {Object[]} 200 - Array of note objects
 * @returns {Object} 500 - Error response
 * @example
 * // Response format:
 * [
 *   {
 *     "id": "note_123",
 *     "title": "Sample Note",
 *     "content": "This is a sample note content"
 *   }
 * ]
 */
```

This creates comprehensive API documentation in the Global section.

## Maintaining Documentation

### Best Practices
1. **Keep documentation up to date** with code changes
2. **Include practical examples** for complex methods
3. **Document error conditions** with `@throws` tags
4. **Use consistent terminology** across all documentation
5. **Document all API endpoints** with complete examples

### Regenerating Documentation
Documentation should be regenerated whenever:
- New methods or classes are added
- Method signatures change
- JSDoc comments are updated
- API endpoints are modified

```bash
# Regenerate documentation
npm run docs
```

### Continuous Documentation
For active development, use the watch mode:
```bash
# Auto-regenerate on file changes
npm run docs:watch
```

### Documentation Quality & Coverage

#### Quality Metrics
The project includes automated quality checking with coverage analysis:

```bash
# Run comprehensive quality check
node scripts/check-docs-coverage.js
```

**Quality Report Includes:**
- **📊 Function Coverage**: Percentage of documented functions
- **📊 Class Coverage**: Percentage of documented classes  
- **❌ Missing Documentation**: List of undocumented code
- **⚠️ Quality Issues**: Missing @returns, @example tags
- **🎯 Overall Score**: Combined documentation score

#### Coverage Thresholds
- **Minimum threshold**: 80% documentation coverage
- **CI/CD enforcement**: Builds fail below threshold
- **Quality gates**: Link checking and syntax validation

#### Example Quality Report
```
📊 Documentation Coverage Report
=====================================

📊 Functions: 12/15 (80.0%)
📊 Classes: 4/4 (100.0%)

✅ All functions and classes are documented!

⚠️ Documentation Quality Issues:
   src/routes/notes-routes.js:45 - Missing: @example

🎯 Overall Documentation Score: 87.5%
✅ Documentation coverage meets 80% threshold
```

## Configuration

### JSDoc Configuration
The JSDoc configuration is in `jsdoc.config.json`:

```json
{
  "source": {
    "include": ["./src/", "./README.md"],
    "includePattern": "\\.(js|jsx)$",
    "exclude": ["node_modules/", "__tests__/"]
  },
  "opts": {
    "destination": "./docs/",
    "recurse": true,
    "readme": "./README.md"
  }
}
```

### Node.js Version Requirements
The documentation system is optimized for **Node.js 22 LTS**:

```json
// package.json
"engines": {
  "node": ">=22.0.0 <23.0.0",  // LTS 22.x only
  "npm": ">=10.0.0"
}
```

**Why LTS 22.x?**
- ✅ **Stability**: Long-term support with 30+ months lifecycle
- ✅ **Performance**: Latest optimizations and ES module support
- ✅ **Compatibility**: All JSDoc and tooling dependencies supported
- ✅ **CI/CD**: Consistent environment across local and GitHub Actions

## Integration with Development Workflow

### Git Integration
The `docs/` folder is added to `.gitignore` since documentation is generated from source code.

### CI/CD Integration (GitHub Actions)

This project includes an **optimized single-job workflow** for documentation that provides:

- ✅ **Fast execution** (~2-3 minutes vs 4-5 minutes for multi-job)
- ✅ **Quality gates** with link checking and coverage validation
- ✅ **Automatic deployment** to GitHub Pages on main branch
- ✅ **Resource efficiency** (single checkout, Node.js setup, and npm install)

#### Workflow Overview
```yaml
# Optimized single-job pipeline (.github/workflows/docs.yml)
jobs:
  docs-pipeline:
    steps:
      # 1. Setup (once)
      - Checkout code
      - Setup Node.js 22 (LTS)
      - Install dependencies
      
      # 2. Build
      - Generate documentation
      
      # 3. Quality checks
      - Check for broken links
      - Validate JSDoc coverage
      
      # 4. Deploy (main branch only)
      - Deploy to GitHub Pages
```

#### Triggers
- **Pull Requests**: Build + Quality checks (no deployment)
- **Main branch pushes**: Build + Quality checks + GitHub Pages deployment
- **Releases**: Full pipeline with deployment

#### Quality Gates
- **Link validation** using linkinator
- **Documentation coverage** analysis
- **JSDoc syntax** validation
- **Deployment** only after all checks pass

#### Performance Optimizations
- **Single job design** eliminates redundant setups
- **Conditional deployment** (main branch only)
- **Artifact upload** only on failure or PRs (for debugging)
- **Node.js 22 LTS** for stability and performance

## Troubleshooting

### Common Issues
1. **Missing documentation**: Ensure JSDoc comments follow proper syntax
2. **Items in Global section**: Check if functions/routes need proper module assignment
3. **Missing examples**: Add `@example` tags for better usability

### Validation
Review generated documentation in `docs/index.html` to ensure:
- All classes and methods appear
- Examples render correctly
- Links between modules work
- Type information is accurate

### Navigation Tips
- **Start with Classes** for understanding the code structure
- **Use Global section** for quick API reference
- **Check individual source files** for implementation details
- **Follow cross-references** between related components

## Deployment & Hosting

### GitHub Pages (Automatic)
Documentation is automatically deployed to GitHub Pages on every push to the main branch:

- 🌐 **Live URL**: `https://username.github.io/repository-name/`
- 🔄 **Auto-updates**: Reflects latest code changes automatically
- 🛡️ **Quality-gated**: Only deploys after passing all checks
- ⚡ **Fast deployment**: ~2-3 minutes from push to live

### Manual Deployment Options
For other hosting platforms:

```bash
# Generate documentation
npm run docs

# Deploy docs/ folder to your preferred hosting:
# - Netlify: Connect to repository with build command "npm run docs"
# - Vercel: Same approach with "npm run docs" 
# - AWS S3: Upload docs/ folder contents
# - Custom server: Serve docs/ as static files
```

### Documentation URLs
Once deployed, users can access:

- **📖 Main documentation**: `/index.html`
- **🌐 API reference**: `/global.html` 
- **📦 Class documentation**: `/ClassName.html`
- **📄 Source code**: `/filename.js.html`

### Performance & SEO
The generated documentation is optimized for:

- ✅ **Fast loading**: Minified CSS/JS, optimized assets
- ✅ **SEO friendly**: Semantic HTML structure
- ✅ **Mobile responsive**: Works on all device sizes
- ✅ **Search indexable**: Proper meta tags and structure 
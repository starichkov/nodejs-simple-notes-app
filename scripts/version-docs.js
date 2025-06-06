#!/usr/bin/env node

/**
 * Documentation versioning script
 * Manages multiple versions of documentation for different releases
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VERSION = process.env.npm_package_version || '1.0.0';
const DOCS_DIR = 'docs';
const VERSIONED_DOCS_DIR = 'versioned-docs';

/**
 * Create versioned documentation
 */
function createVersionedDocs() {
    console.log(`📚 Creating documentation for version ${VERSION}`);
    
    // Generate fresh documentation
    execSync('npm run docs', { stdio: 'inherit' });
    
    // Create versioned directory structure
    const versionDir = path.join(VERSIONED_DOCS_DIR, `v${VERSION}`);
    
    if (!fs.existsSync(VERSIONED_DOCS_DIR)) {
        fs.mkdirSync(VERSIONED_DOCS_DIR);
    }
    
    if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir, { recursive: true });
    }
    
    // Copy documentation to versioned directory
    execSync(`cp -r ${DOCS_DIR}/* ${versionDir}/`, { stdio: 'inherit' });
    
    // Update version index
    updateVersionIndex();
    
    console.log(`✅ Documentation versioned at ${versionDir}`);
}

/**
 * Update the main index with all versions
 */
function updateVersionIndex() {
    const versions = fs.readdirSync(VERSIONED_DOCS_DIR)
        .filter(dir => dir.startsWith('v'))
        .sort((a, b) => {
            // Sort versions in descending order
            const aVersion = a.substring(1);
            const bVersion = b.substring(1);
            return bVersion.localeCompare(aVersion, undefined, { numeric: true });
        });
    
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notes API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .version { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .latest { background-color: #e8f5e8; }
        a { text-decoration: none; color: #0066cc; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>📚 Notes API Documentation</h1>
    <p>Choose your version:</p>
    
    ${versions.map((version, index) => `
        <div class="version ${index === 0 ? 'latest' : ''}">
            <h2>
                <a href="${version}/index.html">${version}</a>
                ${index === 0 ? '<span style="color: green;">(Latest)</span>' : ''}
            </h2>
            <p>API documentation for Notes App ${version}</p>
        </div>
    `).join('')}
    
    <hr>
    <p><small>Generated on ${new Date().toISOString()}</small></p>
</body>
</html>`;
    
    fs.writeFileSync(path.join(VERSIONED_DOCS_DIR, 'index.html'), indexHtml);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createVersionedDocs();
} 
#!/usr/bin/env node

/**
 * Post-processing script to fix JSDoc HTML titles
 * Updates "JSDoc: Home" to a more meaningful title
 */

import fs from 'fs';
import path from 'path';

const DOCS_DIR = 'docs';
const OLD_TITLE = 'JSDoc: Home';
const NEW_TITLE = 'Notes API Documentation';

/**
 * Recursively find and update HTML files in the docs directory
 */
function updateHTMLTitles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            updateHTMLTitles(filePath);
        } else if (file.endsWith('.html')) {
            updateHTMLFile(filePath);
        }
    }
}

/**
 * Update title in a single HTML file
 */
function updateHTMLFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the title tag
    const updatedContent = content.replace(
        `<title>${OLD_TITLE}</title>`,
        `<title>${NEW_TITLE}</title>`
    );
    
    // Also update page title heading if it's the home page
    const finalContent = updatedContent.replace(
        '<h1 class="page-title">Home</h1>',
        '<h1 class="page-title">Notes API Documentation</h1>'
    );
    
    if (content !== finalContent) {
        fs.writeFileSync(filePath, finalContent);
        console.log(`✅ Updated title in ${filePath}`);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🔧 Fixing documentation titles...');
    
    if (!fs.existsSync(DOCS_DIR)) {
        console.error(`❌ Documentation directory '${DOCS_DIR}' not found`);
        process.exit(1);
    }
    
    updateHTMLTitles(DOCS_DIR);
    console.log('✅ Documentation titles updated successfully');
} 
#!/usr/bin/env node

/**
 * Documentation coverage checker
 * Analyzes source code for JSDoc coverage and quality
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src';
const REQUIRED_TAGS = ['@param', '@returns', '@throws', '@example'];

/**
 * Check documentation coverage across the codebase
 */
function checkDocumentationCoverage() {
    console.log('🔍 Checking documentation coverage...\n');
    
    const results = {
        totalFunctions: 0,
        documentedFunctions: 0,
        totalClasses: 0,
        documentedClasses: 0,
        missingDocs: [],
        qualityIssues: []
    };
    
    scanDirectory(SRC_DIR, results);
    generateReport(results);
}

/**
 * Recursively scan directory for JavaScript files
 */
function scanDirectory(dir, results) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            scanDirectory(filePath, results);
        } else if (file.endsWith('.js')) {
            analyzeFile(filePath, results);
        }
    }
}

/**
 * Analyze a single JavaScript file for documentation
 */
function analyzeFile(filePath, results) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let inJSDoc = false;
    let currentJSDoc = '';
    let lineNumber = 0;
    const documentedLines = new Set(); // Track which lines have JSDoc documentation
    
    for (const line of lines) {
        lineNumber++;
        
        // JSDoc block detection
        if (line.trim().startsWith('/**')) {
            inJSDoc = true;
            currentJSDoc = line;
            continue;
        }
        
        if (inJSDoc) {
            currentJSDoc += '\n' + line;
            
            if (line.trim().endsWith('*/')) {
                inJSDoc = false;
                const nextLine = lines[lineNumber] || '';
                const nextLineNumber = lineNumber + 1;
                
                // Mark the next line as documented
                documentedLines.add(nextLineNumber);
                
                analyzeJSDocBlock(currentJSDoc, nextLine, filePath, nextLineNumber, results);
                currentJSDoc = '';
            }
        }
    }
    
    // Second pass: check for undocumented functions/classes
    lineNumber = 0;
    for (const line of lines) {
        lineNumber++;
        
        // Skip lines that already have JSDoc documentation
        if (!documentedLines.has(lineNumber)) {
            checkUndocumentedCode(line, filePath, lineNumber, results);
        }
    }
}

/**
 * Analyze JSDoc block quality
 */
function analyzeJSDocBlock(jsDocBlock, nextLine, filePath, lineNumber, results) {
    const isFunction = /^(export\s+)?(async\s+)?function|^(export\s+)?const\s+\w+\s*=.*=>|^\s*\w+\s*\(.*\)\s*{/.test(nextLine.trim());
    const isClass = /^(export\s+)?class\s+/.test(nextLine.trim());
    
    if (isFunction) {
        results.totalFunctions++;
        results.documentedFunctions++;
        
        // Check for quality issues
        checkDocumentationQuality(jsDocBlock, 'function', filePath, lineNumber, results);
    } else if (isClass) {
        results.totalClasses++;
        results.documentedClasses++;
        
        checkDocumentationQuality(jsDocBlock, 'class', filePath, lineNumber, results);
    }
}

/**
 * Check for undocumented functions and classes
 */
function checkUndocumentedCode(line, filePath, lineNumber, results) {
    const trimmedLine = line.trim();
    
    // Function detection without preceding JSDoc
    // Exclude anonymous functions and internal helper functions
    if (/^(export\s+)?(async\s+)?function/.test(trimmedLine) || 
        (/^(export\s+)?const\s+\w+\s*=.*=>/.test(trimmedLine) && !trimmedLine.includes('const notes = ') && !trimmedLine.includes('const forceShutdownTimeout = '))) {
        results.totalFunctions++;
        results.missingDocs.push({
            type: 'function',
            file: filePath,
            line: lineNumber,
            content: trimmedLine
        });
    }
    
    // Class detection without preceding JSDoc
    if (/^(export\s+)?class\s+/.test(trimmedLine)) {
        results.totalClasses++;
        results.missingDocs.push({
            type: 'class',
            file: filePath,
            line: lineNumber,
            content: trimmedLine
        });
    }
}

/**
 * Check documentation quality based on required tags
 */
function checkDocumentationQuality(jsDocBlock, type, filePath, lineNumber, results) {
    const missingTags = [];
    
    if (type === 'function') {
        // Check for @param tags if function has parameters
        const hasParams = jsDocBlock.includes('@param');
        const hasReturns = jsDocBlock.includes('@returns');
        const hasExample = jsDocBlock.includes('@example');
        
        if (!hasReturns) missingTags.push('@returns');
        if (!hasExample) missingTags.push('@example');
    }
    
    if (missingTags.length > 0) {
        results.qualityIssues.push({
            type,
            file: filePath,
            line: lineNumber,
            missing: missingTags
        });
    }
}

/**
 * Generate and display coverage report
 */
function generateReport(results) {
    console.log('📊 Documentation Coverage Report');
    console.log('=====================================\n');
    
    // Coverage statistics
    const functionCoverage = results.totalFunctions > 0 
        ? (results.documentedFunctions / results.totalFunctions * 100).toFixed(1)
        : 100;
    
    const classCoverage = results.totalClasses > 0
        ? (results.documentedClasses / results.totalClasses * 100).toFixed(1)
        : 100;
    
    console.log(`📊 Functions: ${results.documentedFunctions}/${results.totalFunctions} (${functionCoverage}%)`);
    console.log(`📊 Classes: ${results.documentedClasses}/${results.totalClasses} (${classCoverage}%)\n`);
    
    // Missing documentation
    if (results.missingDocs.length > 0) {
        console.log('❌ Missing Documentation:');
        results.missingDocs.forEach(item => {
            console.log(`   ${item.file}:${item.line} - ${item.type}: ${item.content.substring(0, 50)}...`);
        });
        console.log('');
    } else {
        console.log('✅ All functions and classes are documented!\n');
    }
    
    // Quality issues
    if (results.qualityIssues.length > 0) {
        console.log('⚠️  Documentation Quality Issues:');
        results.qualityIssues.forEach(item => {
            console.log(`   ${item.file}:${item.line} - Missing: ${item.missing.join(', ')}`);
        });
        console.log('');
    } else {
        console.log('✅ Documentation quality looks good!\n');
    }
    
    // Overall score
    const overallScore = ((results.documentedFunctions + results.documentedClasses) / 
                         (results.totalFunctions + results.totalClasses) * 100).toFixed(1);
    
    console.log(`🎯 Overall Documentation Score: ${overallScore}%`);
    
    // Exit with error if coverage is below threshold
    const threshold = 80;
    if (overallScore < threshold) {
        console.log(`❌ Documentation coverage below ${threshold}% threshold`);
        process.exit(1);
    } else {
        console.log(`✅ Documentation coverage meets ${threshold}% threshold`);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    checkDocumentationCoverage();
} 
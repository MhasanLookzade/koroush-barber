#!/usr/bin/env node
/**
 * Design Token Validation Script
 * Validates that all CSS custom properties are properly defined and used
 * Run with: node scripts/validate-tokens.cjs
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const GLOBALS_CSS = path.join(PROJECT_ROOT, 'app', 'globals.css');
const TAILWIND_CONFIG = path.join(PROJECT_ROOT, 'tailwind.config.ts');
const DESIGN_TOKENS_JSON = path.join(PROJECT_ROOT, 'assets', 'design-tokens.json');

// Read files
const globalsCss = fs.readFileSync(GLOBALS_CSS, 'utf-8');
const tailwindConfig = fs.readFileSync(TAILWIND_CONFIG, 'utf-8');
let designTokens;
try {
  designTokens = JSON.parse(fs.readFileSync(DESIGN_TOKENS_JSON, 'utf-8'));
} catch (e) {
  console.error('❌ Failed to parse design-tokens.json:', e.message);
  process.exit(1);
}

// Extract CSS custom properties from globals.css
const cssVarRegex = /--([\w-]+):\s*([^;]+);/g;
const cssVars = new Map();
let match;
while ((match = cssVarRegex.exec(globalsCss)) !== null) {
  cssVars.set(match[1], match[2].trim());
}

console.log('🔍 Design Token Validation Report');
console.log('==================================\n');

// 1. Check primitive tokens exist in CSS
console.log('1. PRIMITIVE TOKENS CHECK');
const primitiveColors = designTokens.tokenSets.primitive.tokens.color;
let primitiveMissing = 0;
for (const [name, token] of Object.entries(primitiveColors)) {
  const cssName = name.replace(/([A-Z])/g, '-$1').toLowerCase();
  if (!cssVars.has(cssName)) {
    console.log(`  ❌ Missing: --${cssName} (${token.description})`);
    primitiveMissing++;
  }
}
if (primitiveMissing === 0) {
  console.log('  ✅ All primitive color tokens present in CSS');
}
console.log(`  Total: ${Object.keys(primitiveColors).length} | Missing: ${primitiveMissing}\n`);

// 2. Check semantic tokens (dark mode) exist in CSS
console.log('2. SEMANTIC TOKENS CHECK (Dark Mode)');
const semanticDark = designTokens.tokenSets.semantic.tokens.dark;
let semanticMissing = 0;
for (const [name, token] of Object.entries(semanticDark)) {
  if (!cssVars.has(name)) {
    console.log(`  ❌ Missing: --${name} (${token.description})`);
    semanticMissing++;
  }
}
if (semanticMissing === 0) {
  console.log('  ✅ All semantic tokens present in CSS');
}
console.log(`  Total: ${Object.keys(semanticDark).length} | Missing: ${semanticMissing}\n`);

// 3. Check Tailwind config maps semantic colors
console.log('3. TAILWIND COLOR MAPPING CHECK');
// Colors that should be at top level (simple)
const simpleColors = ['border', 'input', 'ring', 'background', 'foreground'];
// Colors that use nested structure with DEFAULT, foreground, border
const nestedColors = [
  { name: 'primary', keys: ['DEFAULT', 'foreground'] },
  { name: 'secondary', keys: ['DEFAULT', 'foreground'] },
  { name: 'destructive', keys: ['DEFAULT', 'foreground'] },
  { name: 'muted', keys: ['DEFAULT', 'foreground'] },
  { name: 'accent', keys: ['DEFAULT', 'foreground'] },
  { name: 'popover', keys: ['DEFAULT', 'foreground'] },
  { name: 'card', keys: ['DEFAULT', 'foreground'] },
  { name: 'success', keys: ['DEFAULT', 'foreground', 'border'] },
  { name: 'warning', keys: ['DEFAULT', 'foreground', 'border'] },
  { name: 'info', keys: ['DEFAULT', 'foreground', 'border'] },
];
let tailwindMissing = 0;

// Check simple colors
for (const color of simpleColors) {
  const pattern = new RegExp(`${color}:\\s*["']hsl\\(var\\(--${color.replace(/-/g, '\\-')}\\)\\)["']`, 'm');
  if (!tailwindConfig.match(pattern)) {
    console.log(`  ❌ Tailwind missing mapping for: ${color}`);
    tailwindMissing++;
  }
}

// Check nested colors
for (const { name, keys } of nestedColors) {
  for (const key of keys) {
    const cssVar = key === 'DEFAULT' ? name : `${name}-${key}`;
    const pattern = new RegExp(`${key}:\\s*["']hsl\\(var\\(--${cssVar.replace(/-/g, '\\-')}\\)\\)["']`, 'm');
    if (!tailwindConfig.match(pattern)) {
      console.log(`  ❌ Tailwind missing mapping for: ${name}.${key} (--${cssVar})`);
      tailwindMissing++;
    }
  }
}
if (tailwindMissing === 0) {
  console.log('  ✅ All semantic colors mapped in Tailwind config');
}
console.log(`  Total checked | Missing: ${tailwindMissing}\n`);

// 4. Check for hardcoded values in components
console.log('4. HARDCODED VALUE CHECK');
const componentDir = path.join(PROJECT_ROOT, 'components');
const hardcodedPatterns = [
  { pattern: /#[0-9a-fA-F]{3,8}/g, name: 'Hex colors' },
  { pattern: /rgb\([^)]+\)/g, name: 'RGB colors' },
  { pattern: /hsl\([^)]+\)/g, name: 'HSL colors (non-var)' },
];

function scanDir(dir, results = {}) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', '.next'].includes(file)) {
        scanDir(fullPath, results);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const { pattern, name } of hardcodedPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          if (!results[name]) results[name] = [];
          results[name].push({ file: path.relative(PROJECT_ROOT, fullPath), count: matches.length, samples: matches.slice(0, 3) });
        }
      }
    }
  }
  return results;
}

const hardcodedResults = scanDir(componentDir);
for (const [name, occurrences] of Object.entries(hardcodedResults)) {
  const totalCount = occurrences.reduce((sum, o) => sum + o.count, 0);
  if (totalCount > 0) {
    console.log(`  ⚠️  ${name}: ${totalCount} occurrences in ${occurrences.length} files`);
    for (const occ of occurrences.slice(0, 3)) {
      console.log(`     ${occ.file}: ${occ.count} (e.g., ${occ.samples.join(', ')})`);
    }
    if (occurrences.length > 3) {
      console.log(`     ... and ${occurrences.length - 3} more files`);
    }
  }
}
if (Object.keys(hardcodedResults).length === 0) {
  console.log('  ✅ No hardcoded values detected');
}
console.log();

// Summary
const totalIssues = primitiveMissing + semanticMissing + tailwindMissing;
console.log('==================================');
console.log(`SUMMARY: ${totalIssues} critical issues found`);
if (totalIssues === 0) {
  console.log('🎉 All design token validations passed!');
  process.exit(0);
} else {
  console.log('⚠️  Please address the issues above');
  process.exit(1);
}
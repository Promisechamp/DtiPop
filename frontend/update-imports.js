import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      updateImports(fullPath);
    }
  }
}

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern 1: import PageNavigation from '...'
  const pattern1 = /import\s+PageNavigation\s+from\s+['"]([^'"]+PageNavigation[^'"]*)['"]/g;
  
  content = content.replace(pattern1, (match, source) => {
    if (source.includes('PageNavigation') && !source.includes('PageNavigationSkeleton')) {
      changed = true;
      return `import { PageNavigation, PageNavigationSkeleton } from '${source}'`;
    }
    return match;
  });

  // Pattern 2: import PageNavigation as SomeName from '...'
  const pattern2 = /import\s+PageNavigation\s+as\s+(\w+)\s+from\s+['"]([^'"]+PageNavigation[^'"]*)['"]/g;
  
  content = content.replace(pattern2, (match, alias, source) => {
    if (source.includes('PageNavigation') && !source.includes('PageNavigationSkeleton')) {
      changed = true;
      return `import { PageNavigation as ${alias}, PageNavigationSkeleton as ${alias}Skeleton } from '${source}'`;
    }
    return match;
  });

  // Pattern 3: import PageNavigation, { something } from '...' (mixed imports - rare but possible)
  const pattern3 = /import\s+PageNavigation\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+PageNavigation[^'"]*)['"]/g;
  
  content = content.replace(pattern3, (match, otherImports, source) => {
    if (source.includes('PageNavigation') && !source.includes('PageNavigationSkeleton')) {
      changed = true;
      // Check if PageNavigationSkeleton is already in the other imports
      if (!otherImports.includes('PageNavigationSkeleton')) {
        return `import { PageNavigation, ${otherImports.trim()}, PageNavigationSkeleton } from '${source}'`;
      }
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

walk(srcDir);
console.log('✅ Done updating PageNavigation imports.');
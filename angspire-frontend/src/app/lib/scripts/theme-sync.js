// ----------------------------------------
// theme-sync.js
// Syncs theme colors between :root, @theme, and themes.json
// Only edits values inside /* Theme START */ and /* Theme END */ blocks
// ----------------------------------------

const fs = require('fs');
const path = require('path');

const cssScssPath = path.resolve(process.cwd(), 'src/styles.scss');
const cssPath = path.resolve(process.cwd(), 'src/styles.css');
const possibleCssPaths = [cssScssPath, cssPath];
const themesJsonPath = path.resolve(process.cwd(), 'public/themes.json');

const defaultRootVars = {
  background: '#ffffff',
  foreground: '#000000',
  primary: '#18181b',
  secondary: '#2B2B2B',
  accent: '#D80032',
};

function getTargetPath() {
  return possibleCssPaths.find(fs.existsSync) || cssPath;
}

function extractRootVariables(content) {
  const rootBlock = content.match(/:root\s*{[\s\S]*?\/\* Theme START \*\/([\s\S]*?)\/\* Theme END \*\//m);
  if (!rootBlock) return { vars: defaultRootVars, exists: false };
  const block = rootBlock[1];
  const vars = {};
  block.split(';').forEach(line => {
    line = line.trim();
    if (line.startsWith('--')) {
      const [key, value] = line.split(':').map(x => x.trim());
      if (key && value) vars[key.replace('--', '')] = value;
    }
  });
  return { vars, exists: true };
}

function generateRootBlock(vars) {
  return (
    `:root {\n  /* npm run theme update */\n  /* Theme START */\n` +
    Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n') +
    `\n  /* Theme END */\n}`
  );
}

function generateThemeBlock(vars) {
  return (
    `@theme {\n  /* Theme START */\n` +
    Object.keys(vars).map(k => `  --color-${k}: var(--${k});`).join('\n') +
    `\n  /* Theme END */\n}`
  );
}

// Replace contents inside /* Theme START */ ... /* Theme END */ for a selector block
function replaceThemeBlock(content, selector, newBlockContent) {
  const blockRegex = new RegExp(
    `(${selector}\\s*{[\\s\\S]*?/\\* Theme START \\*/)([\\s\\S]*?)(/\\* Theme END \\*/[\\s\\S]*?})`,
    'm'
  );
  if (!blockRegex.test(content)) return null;
  return content.replace(blockRegex, (_m, before, _old, after) => `${before}\n${newBlockContent}\n${after}`);
}

// Insert or ensure :root and @theme blocks in correct order, after all imports/comments
function getThemeBlockLinesFromRootBlock(rootBlock) {
  // This will preserve comments and blank lines!
  return rootBlock.split('\n').map(line => {
    const trimmed = line.trim();
    // Match lines like: --background: #fafafa;
    const varMatch = trimmed.match(/^--([a-zA-Z0-9\-_]+):\s*([^;]+);?$/);
    if (varMatch) {
      const varName = varMatch[1];
      return `  --color-${varName}: var(--${varName});`;
    }
    // Comments or blank lines, just indent and preserve
    if (trimmed.startsWith('/*') || trimmed === '') return '  ' + trimmed;
    return '';
  }).filter(Boolean).join('\n');
}

function ensureRootAndThemeBlocks() {
  const targetPath = getTargetPath();
  let content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';

  // 1. Find all leading comments/imports
  const importCommentMatch = content.match(/^(?:\s*(?:\/\*[\s\S]*?\*\/\s*|@import\s+["'][^"']+["'];\s*)*)/);
  const importsAndComments = importCommentMatch ? importCommentMatch[0] : '';
  let rest = content.slice(importsAndComments.length).trim();

  // Find the :root theme block (with Theme START/END)
  let rootBlockMatch = rest.match(/:root\s*{[\s\S]*?\/\* Theme START \*\/([\s\S]*?)\/\* Theme END \*\/[\s\S]*?}/m);
  let rootBlockContent = rootBlockMatch ? rootBlockMatch[1] : null;
  let rootVars = {};
  let rootBlock;

  if (!rootBlockContent) {
    // If not found, use default variables as new block
    rootBlockContent = Object.entries(defaultRootVars).map(([k, v]) => `  --${k}: ${v};`).join('\n');
    rootBlock =
      `:root {\n  /* npm run theme update */\n  /* Theme START */\n${rootBlockContent}\n  /* Theme END */\n}`;
  } else {
    // Keep the original :root block (with formatting)
    rootBlock = rest.match(/:root\s*{[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/m)[0];
  }

  // Generate new @theme block from the parsed root block content (keep order/spacing/comments)
  const themeBlockContent = getThemeBlockLinesFromRootBlock(rootBlockContent);
  const themeBlock =
    `@theme {\n  /* Theme START */\n${themeBlockContent}\n  /* Theme END */\n}`;

  // Remove old :root and @theme blocks with Theme markers
  rest = rest
    .replace(/:root\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
    .replace(/@theme\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '');

  // Compose final CSS
  let newContent = importsAndComments.trimEnd();
  if (newContent) newContent += '\n\n';
  newContent += rootBlock + '\n\n' + themeBlock;
  if (rest.trim()) newContent += '\n\n' + rest.trim();

  fs.writeFileSync(targetPath, newContent.trim() + '\n', 'utf-8');
  console.log(`✅ Synced :root and @theme blocks in ${path.basename(targetPath)}`);
}

function updateThemesJson(vars, themesJsonPath) {
  let themes = [];
  if (fs.existsSync(themesJsonPath)) {
    try {
      const raw = fs.readFileSync(themesJsonPath, 'utf-8');
      const loaded = JSON.parse(raw);
      if (Array.isArray(loaded)) themes = loaded;
    } catch (e) {
      console.warn('Could not read or parse themes.json, recreating.');
    }
  }
  if (themes.length === 0) {
    themes = [
      { name: "Light", colors: { ...vars } },
      { name: "Dark", colors: { ...vars } }
    ];
  } else {
    themes.forEach(theme => {
      if (!theme.colors) theme.colors = {};
      Object.keys(vars).forEach(varName => {
        if (!(varName in theme.colors)) theme.colors[varName] = vars[varName];
      });
    });
  }
  fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');
  console.log('✅ Updated themes.json with theme variables.');
}

function syncTheme() {
  ensureRootAndThemeBlocks();
  let cssFile = getTargetPath();
  let content = fs.readFileSync(cssFile, 'utf-8');
  let { vars: rootVars } = extractRootVariables(content);
  if (rootVars && Object.keys(rootVars).length > 0) {
    updateThemesJson(rootVars, themesJsonPath);
  } else {
    console.log('⚠️  No CSS variables found to sync.');
  }
}

function initStylesFile() {
  ensureRootAndThemeBlocks();
}

function clearThemes() {
  fs.writeFileSync(themesJsonPath, '[]', 'utf-8');
  console.log('🧹 Cleared themes.json.');
}

// CLI
const command = process.argv[2];
switch (command) {
  case 'update':
    syncTheme();
    break;
  case 'clear':
    clearThemes();
    break;
  case 'init':
    initStylesFile();
    break;
  default:
    console.log('Invalid command. Use one of (npm run theme <command>):');
    console.log('  "update" → sync themes');
    console.log('  "clear"  → clear all theme entries');
    console.log('  "init"   → create styles file with :root and @theme blocks');
    break;
}

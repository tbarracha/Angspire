// ----------------------------------------
// theme-sync.js
// Syncs theme colors between styles.scss, tailwind.config.js, and themes.json
// ----------------------------------------

const fs = require('fs');
const path = require('path');

// Utility: Convert kebab-case to camelCase
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// File paths - Always resolve from project root
const cssScssPath = path.resolve(process.cwd(), 'src/styles.scss');
const cssPath = path.resolve(process.cwd(), 'src/styles.css');

const possibleCssPaths = [cssScssPath, cssPath];

const tailwindConfigPath = path.resolve(process.cwd(), 'tailwind.config.js');
const themesJsonPath = path.resolve(process.cwd(), 'public/themes.json');

// Default theme block
const defaultThemeBlock = `:root {
  /* npm run theme -- update */
  /* Theme START */
  --background: #ffffff;
  --foreground: #000000;

  --primary: #18181b;
  --secondary: #2B2B2B;
  --accent: #D80032;
  /* Theme END */
}
`;

// Extract variables from CSS (scss or css)
function extractVariablesFromCSS() {
  const cssFile = possibleCssPaths.find(fs.existsSync);
  if (!cssFile) {
    console.error('Neither styles.scss nor styles.css was found.');
    return {};
  }

  const content = fs.readFileSync(cssFile, 'utf-8');
  const rootMatch = content.match(/:root\s*{([\s\S]*?\/\* Theme START \*\/([\s\S]*?)\/\* Theme END \*\/[\s\S]*?)}/);

  if (!rootMatch) {
    console.error('No valid :root section with Theme markers found in the CSS file.');
    return {};
  }

  return rootMatch[2]
    .split(';')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('--'))
    .reduce((acc, line) => {
      const [key, value] = line.split(':').map((part) => part.trim());
      acc[key.replace('--', '')] = value;
      return acc;
    }, {});
}

// Update Tailwind config with colors only
function updateTailwindConfig(variables, configPath) {
  let configContent = fs.readFileSync(configPath, 'utf-8');

  const startMarker = '// Theme START';
  const endMarker = '// Theme END';
  const startIndex = configContent.indexOf(startMarker);
  const endIndex = configContent.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Markers for Theme not found in the Tailwind config.');
    return;
  }

  const beforeSection = configContent.slice(0, startIndex + startMarker.length);
  const afterSection = configContent.slice(endIndex);

  const updatedColors = Object.keys(variables)
    .map((key) => `        '${key}': 'var(--${key})',`)
    .join('\n');

  const newConfigSection = `\n${updatedColors}\n`;
  configContent = `${beforeSection}${newConfigSection}${afterSection}`;
  fs.writeFileSync(configPath, configContent, 'utf-8');

  console.log('✅ Updated Tailwind config with theme colors.');
}

// Update themes.json
function updateThemesJson(variables, themesJsonPath) {
  // Try to load existing themes
  let themes = [];
  if (fs.existsSync(themesJsonPath)) {
    try {
      const raw = fs.readFileSync(themesJsonPath, 'utf-8');
      const loaded = JSON.parse(raw);
      if (Array.isArray(loaded)) {
        themes = loaded;
      }
    } catch (e) {
      console.warn('Could not read or parse themes.json, recreating.');
    }
  }

  // If no themes, create Light/Dark by default
  if (themes.length === 0) {
    themes = [
      { name: "Light", colors: { ...variables } },
      { name: "Dark", colors: { ...variables } }
    ];
  } else {
    // For each theme, merge in new variables (add or update)
    themes.forEach(theme => {
      if (!theme.colors) theme.colors = {};
      Object.keys(variables).forEach(varName => {
        if (!(varName in theme.colors)) {
          theme.colors[varName] = variables[varName];
        }
      });
    });
  }

  fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');
  console.log('✅ Updated themes.json with theme variables.');
}

// Create styles file with default theme block
function initStylesFile() {
  let targetPath = possibleCssPaths.find(fs.existsSync) || cssPath;

  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, defaultThemeBlock, 'utf-8');
    console.log(`✅ Created ${path.basename(targetPath)} with default theme variables.`);
    return;
  }

  const existing = fs.readFileSync(targetPath, 'utf-8');
  if (/\/\* Theme START \*\//.test(existing)) {
    console.log(`⚠️  ${path.basename(targetPath)} already contains a theme block. Skipping init.`);
    return;
  }

  fs.appendFileSync(targetPath, `\n\n${defaultThemeBlock}`, 'utf-8');
  console.log(`✅ Appended default theme block to ${path.basename(targetPath)}.`);
}

// Sync themes
function syncTheme() {
  const variables = extractVariablesFromCSS();
  if (Object.keys(variables).length > 0) {
    if (fs.existsSync(tailwindConfigPath)) {
      updateTailwindConfig(variables, tailwindConfigPath);
    } else {
      console.log('ℹ️  Skipping Tailwind config update: tailwind.config.js not found (expected in Tailwind v4).');
    }
    updateThemesJson(variables, themesJsonPath);
  } else {
    console.log('⚠️  No CSS variables found to sync.');
  }
}

// Clear all themes
function clearThemes() {
  if (fs.existsSync(tailwindConfigPath)) {
    let tailwindContent = fs.readFileSync(tailwindConfigPath, 'utf-8');
    tailwindContent = tailwindContent.replace(/\/\/ Theme START[\s\S]*?\/\/ Theme END/, '// Theme START\n// Theme END');
    fs.writeFileSync(tailwindConfigPath, tailwindContent, 'utf-8');
    console.log('🧹 Cleared Tailwind theme colors.');
  } else {
    console.log('ℹ️  Skipping Tailwind config cleanup: tailwind.config.js not found.');
  }

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
    console.log('  "init"   → create styles file with default theme block');
    break;
}

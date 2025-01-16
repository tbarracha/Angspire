// ----------------------------------------
// theme-sync.js
// Syncs theme colors between styles.scss, tailwind.config.js, and themes.json
// ----------------------------------------

// Run with: node theme-sync update | node theme-sync clear

const fs = require('fs');
const path = require('path');

// Utility: Convert kebab-case to camelCase
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// File paths
const cssFilePath = path.resolve(__dirname, 'src/styles.scss');
const tailwindConfigPath = path.resolve(__dirname, 'tailwind.config.js');
const themesJsonPath = path.resolve(__dirname, 'public/themes.json');

// Extract variables from styles.scss
function extractVariablesFromCSS(cssFile) {
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

  // Generate colors section only
  const updatedColors = Object.keys(variables)
    .map((key) => `        '${key}': 'var(--${key})',`)
    .join('\n');

  const newConfigSection = `\n${updatedColors}\n`;

  // Inject updated content into Tailwind config
  configContent = `${beforeSection}${newConfigSection}${afterSection}`;
  fs.writeFileSync(configPath, configContent, 'utf-8');

  console.log('Updated Tailwind config with theme colors.');
}

// Update themes.json
function updateThemesJson(variables, themesJsonPath) {
  if (!fs.existsSync(themesJsonPath)) {
    fs.writeFileSync(themesJsonPath, JSON.stringify([{
      name: "Light"
    }, {
      name: "Dark"
    }], null, 2), 'utf-8');
  }

  let themes = JSON.parse(fs.readFileSync(themesJsonPath, 'utf-8'));
  if (themes.length === 0) {
    themes = [
      {
        name: "Light"
      },
      {
        name: "Dark"
      }
    ];
  }

  const variableNames = Object.keys(variables);
  themes.forEach((theme) => {
    variableNames.forEach((varName) => {
      const propertyName = toCamelCase(varName);
      if (!(propertyName in theme)) {
        theme[propertyName] = variables[varName];
      }
    });
  });

  fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');
  console.log('Updated themes.json with theme variables.');
}

// Sync themes
function syncTheme() {
  const variables = extractVariablesFromCSS(cssFilePath);
  if (Object.keys(variables).length > 0) {
    updateTailwindConfig(variables, tailwindConfigPath);
    updateThemesJson(variables, themesJsonPath);
  } else {
    console.log('No CSS variables found to sync.');
  }
}

// Clear all themes
function clearThemes() {
  // Clear Tailwind theme colors
  let tailwindContent = fs.readFileSync(tailwindConfigPath, 'utf-8');
  tailwindContent = tailwindContent.replace(/\/\/ Theme START[\s\S]*?\/\/ Theme END/, '// Theme START\n// Theme END');
  fs.writeFileSync(tailwindConfigPath, tailwindContent, 'utf-8');
  console.log('Cleared Tailwind theme colors.');

  // Clear themes.json
  fs.writeFileSync(themesJsonPath, '[]', 'utf-8');
  console.log('Cleared themes.json.');
}

// Command-line arguments
const command = process.argv[2];
switch (command) {
  case 'update':
    syncTheme();
    break;
  case 'clear':
    clearThemes();
    break;
  default:
    console.log('Invalid command. Use "update" to sync themes or "clear" to remove all themes.');
    break;
}

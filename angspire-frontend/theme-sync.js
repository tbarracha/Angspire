// ----------------------------------------
// theme-sync.js
// This script is used to sync the theme
// colors from styles.scss to tailwind.config.js
// and themes.json
// ----------------------------------------

const fs = require('fs');
const path = require('path');

// Function to convert kebab-case to camelCase
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// File paths
// File paths
console.log("\nDIR:", __dirname, "\n\n");
const cssFilePath = path.resolve(__dirname, 'src/styles.scss'); // Correct relative path
const tailwindConfigPath = path.resolve(__dirname, 'tailwind.config.js'); // Correct relative path
const themesJsonPath = path.resolve(__dirname, 'public/themes.json'); // Correct relative path

// Function to extract variables from the specific section in CSS :root
function extractVariablesFromCSS(cssFile) {
  const content = fs.readFileSync(cssFile, 'utf-8');

  // Match the :root section with Theme markers
  const rootMatch = content.match(/:root\s*{([\s\S]*?\/\* Theme START \*\/([\s\S]*?)\/\* Theme END \*\/[\s\S]*?)}/);

  if (!rootMatch) {
    console.error('No valid :root section with Theme markers found in the CSS file.');
    return {};
  }

  // Extract variables between Theme START and Theme END
  const themeSection = rootMatch[2]
    .split(';') // Split each line
    .map((line) => line.trim()) // Trim spaces
    .filter((line) => line.startsWith('--')) // Keep only variables
    .reduce((acc, line) => {
      const [key, value] = line.split(':').map((part) => part.trim());
      acc[key.replace('--', '')] = value;
      return acc;
    }, {});

  return themeSection;
}

//-----------------------------------------
// Update Theme
// ----------------------------------------

// Function to update colors section between comments in Tailwind config
function updateTailwindColors(variables, configPath) {
  // Read the Tailwind config as plain text
  let configContent = fs.readFileSync(configPath, 'utf-8');

  // Locate the section between the comments
  const startMarker = '// Theme START';
  const endMarker = '// Theme END';

  const startIndex = configContent.indexOf(startMarker);
  const endIndex = configContent.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error(
      'Markers for Theme not found in the Tailwind config. Ensure both START and END markers exist.'
    );
    return;
  }

  const beforeSection = configContent.slice(0, startIndex + startMarker.length);
  const afterSection = configContent.slice(endIndex);

  // Extract existing colors in the theme section
  const themeSection = configContent
    .slice(startIndex + startMarker.length, endIndex)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))
    .reduce((acc, line) => {
      const [key, value] = line.split(':').map((part) => part.trim().replace(/['",]/g, ''));
      acc[key] = value;
      return acc;
    }, {});

  const addedColors = [];

  // Add missing colors from styles.scss
  Object.keys(variables).forEach((key) => {
    if (!themeSection[key]) {
      themeSection[key] = `var(--${key})`;
      addedColors.push(key);
    }
  });

  // Reorganize colors based on the order in styles.scss
  const sortedColors = Object.keys(variables).reduce((acc, key) => {
    if (themeSection[key]) {
      acc[key] = themeSection[key];
    }
    return acc;
  }, {});

  // Add any custom colors that are not in styles.scss
  Object.keys(themeSection).forEach((key) => {
    if (!sortedColors[key]) {
      sortedColors[key] = themeSection[key];
    }
  });

  // Rebuild the colors section
  const updatedThemeSection = Object.entries(sortedColors)
    .map(([key, value]) => `        '${key}': '${value}',`)
    .join('\n');

  // Reconstruct the config file
  configContent = `${beforeSection}\n${updatedThemeSection}\n        ${afterSection}`;

  // Write back the updated Tailwind config
  fs.writeFileSync(configPath, configContent, 'utf-8');

  // Debug messages for added colors
  if (addedColors.length > 0) {
    console.log(
      `Added the following colors to Tailwind config:\n${addedColors.map((color) => `- ${color}`).join('\n')}`
    );
  } else {
    console.log(
      'No colors have been added. Reason: All colors from styles.scss are already present in the Tailwind config.'
    );
  }
}

// Function to update themes.json
function updateThemesJson(variables, themesJsonPath) {
  let themes = [];

  // Read existing themes from themes.json
  if (fs.existsSync(themesJsonPath)) {
    const themesContent = fs.readFileSync(themesJsonPath, 'utf-8');
    try {
      themes = JSON.parse(themesContent);
    } catch (error) {
      console.error('Failed to parse themes.json:', error);
      return;
    }
  } else {
    console.warn('themes.json does not exist. Creating a new one.');
  }

  const variableNames = Object.keys(variables);
  const variableMappings = variableNames.map((varName) => ({
    cssVarName: varName,
    propertyName: toCamelCase(varName),
    value: variables[varName],
  }));

  themes.forEach((theme) => {
    variableMappings.forEach((mapping) => {
      if (!(mapping.propertyName in theme)) {
        theme[mapping.propertyName] = mapping.value;
      }
    });
  });

  // Save updated themes back to themes.json
  fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');
  console.log('Updated themes in themes.json with new properties.');
}

function syncTheme() {
  const variables = extractVariablesFromCSS(cssFilePath);
  if (Object.keys(variables).length > 0) {
    updateTailwindColors(variables, tailwindConfigPath);
    updateThemesJson(variables, themesJsonPath);
  } else {
    console.log('No CSS variables found to sync. Reason: :root section is missing in the CSS file.');
  }
}

//-----------------------------------------
// Clear Themes
// ----------------------------------------

// Function to clear themes in Tailwind and other files
function clearThemes() {
  try {
    const variables = extractVariablesFromCSS(cssFilePath);
    if (Object.keys(variables).length === 0) {
      console.log('No CSS variables found to clear. Reason: :root section is missing in the CSS file.');
      return;
    }

    // Convert variable names to camelCase
    const variableMappings = Object.keys(variables).map((varName) => ({
      cssVarName: varName,
      propertyName: toCamelCase(varName),
    }));

    // Clear Tailwind themes
    let tailwindConfigContent = fs.readFileSync(tailwindConfigPath, 'utf-8');
    const startMarker = '// Theme START';
    const endMarker = '// Theme END';

    const startIndex = tailwindConfigContent.indexOf(startMarker);
    const endIndex = tailwindConfigContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      console.error('Markers for Theme not found in the Tailwind config.');
      return;
    }

    const beforeSection = tailwindConfigContent.slice(0, startIndex + startMarker.length);
    const afterSection = tailwindConfigContent.slice(endIndex);

    tailwindConfigContent = `${beforeSection}\n        // Theme colors cleared\n${afterSection}`;
    fs.writeFileSync(tailwindConfigPath, tailwindConfigContent, 'utf-8');

    console.log('Cleared all theme colors from Tailwind config.');

    // Clear themes in themes.json
    if (fs.existsSync(themesJsonPath)) {
      const themesContent = fs.readFileSync(themesJsonPath, 'utf-8');
      let themes = [];
      try {
        themes = JSON.parse(themesContent);
      } catch (error) {
        console.error('Failed to parse themes.json:', error);
        return;
      }

      themes.forEach((theme) => {
        variableMappings.forEach((mapping) => {
          if (mapping.propertyName in theme) {
            delete theme[mapping.propertyName];
          }
        });
      });

      fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');
      console.log('Cleared theme properties from themes.json.');
    } else {
      console.warn('themes.json does not exist. Nothing to clear.');
    }
  } catch (error) {
    console.error('Failed to clear themes:', error);
  }
}

// Parse Command-Line Arguments
const command = process.argv[2];
switch (command) {
  case 'sync':
    syncTheme();
    break;
  case 'clear':
    clearThemes();
    break;
  default:
    console.log('Invalid command. Use "sync" to sync themes or "clear" to clear themes.');
    break;
}

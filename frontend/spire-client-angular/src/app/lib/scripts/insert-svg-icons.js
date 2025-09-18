const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const ICONS_FILE = path.join('src', 'app', 'features', 'icons', 'icons.ts');
const SVG_DIR = path.join('src', 'app', 'features', 'icons', 'svgs');
const iconsFilePath = path.resolve(process.cwd(), ICONS_FILE);
const svgDirPath = path.resolve(process.cwd(), SVG_DIR);

// --- UTIL: Convert to camelCase ---
function toCamelCase(str) {
  return str
    .replace(/[-_ ]+(\w)/g, (_, c) => c ? c.toUpperCase() : '') // dash/underscore/space to uppercase
    .replace(/^[A-Z]/, c => c.toLowerCase()); // first letter always lowercase
}

// --- LOAD SVG FILES ---
const svgFiles = fs.readdirSync(svgDirPath).filter(f => f.endsWith('.svg'));
const svgMap = {};
svgFiles.forEach(f => {
  const raw = fs.readFileSync(path.join(svgDirPath, f), 'utf-8').trim();
  const name = toCamelCase(path.basename(f, '.svg'));
  svgMap[name] = raw;
});

// --- READ AND PARSE ICONS.TS ---
let iconsRaw = fs.readFileSync(iconsFilePath, 'utf-8');

// Regex to match static readonly iconName: Icon = { svg: `...`, url: '...' };
const iconRegex = /static readonly (\w+)\s*:\s*Icon\s*=\s*{([\s\S]*?)svg\s*:\s*`([\s\S]*?)`,([\s\S]*?)url\s*:\s*'([^']*)'([\s\S]*?)};/g;

let foundIcons = {};
let updatedIconsRaw = iconsRaw.replace(iconRegex, (full, iconName, beforeSvg, svg, afterSvg, url, afterUrl) => {
  const camelName = toCamelCase(iconName);
  foundIcons[camelName] = true;
  // Clean up: Remove any duplicate url fields in afterSvg or afterUrl
  const cleanedAfterSvg = afterSvg.replace(/url\s*:\s*''?,?/g, '');
  const cleanedAfterUrl = (afterUrl || '').replace(/url\s*:\s*''?,?/g, '');
  // If an SVG is available, update svg only.
  if (svgMap[camelName]) {
    return `static readonly ${iconName}: Icon = {${beforeSvg}svg:\`${svgMap[camelName].replace(/`/g, '\\`')}\`,${cleanedAfterSvg}url: '${url}'${cleanedAfterUrl}};`;
  }
  return full;
});

// --- ADD NEW ICONS (that don't already exist) ---
const missingIcons = Object.keys(svgMap).filter(name => !foundIcons[name]);
if (missingIcons.length) {
  // Add new icons before the last class/namespace/module closing brace if present
  // Use regex to find the class closing '}' that's NOT followed by another '}'
  const classCloseMatch = /([ \t]*)\}(?![\s\S]*\})/.exec(updatedIconsRaw);
  let insertPos = updatedIconsRaw.length;
  let indent = '';
  if (classCloseMatch) {
    insertPos = classCloseMatch.index;
    indent = classCloseMatch[1] || '';
  }
  const newEntries = missingIcons.map(name =>
    `${indent}    static readonly ${name}: Icon = {\n${indent}        svg:\`${svgMap[name].replace(/`/g, '\\`')}\`,\n${indent}        url: ''\n${indent}    };`
  ).join('\n\n');
  updatedIconsRaw = updatedIconsRaw.slice(0, insertPos) + newEntries + '\n' + updatedIconsRaw.slice(insertPos);
}

fs.writeFileSync(iconsFilePath, updatedIconsRaw, 'utf-8');
console.log(`✅ icons.ts updated. Processed ${svgFiles.length} SVGs (${missingIcons.length} new icons added, all in camelCase, nothing removed, url deduped).`);

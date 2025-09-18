// update-icon-colors.js

const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const ICONS_FILE = path.join('src', 'app', 'features', 'icons', 'icons.ts');
const BACKUP_FILE = ICONS_FILE + '.bak';

const iconsFilePath = path.resolve(process.cwd(), ICONS_FILE);

// Create backup if needed
if (!fs.existsSync(BACKUP_FILE)) {
  fs.copyFileSync(iconsFilePath, BACKUP_FILE);
  console.log(`🔒 Backup created at ${BACKUP_FILE}`);
}

let content = fs.readFileSync(iconsFilePath, 'utf-8');

// Match each Icon block
const iconBlockRegex = /(static readonly (\w+)\s*:\s*Icon\s*=\s*{[\s\S]*?svg\s*:\s*`)([\s\S]*?)(`,\s*url\s*:\s*'[^']*'[\s\S]*?})/g;

content = content.replace(iconBlockRegex, (whole, prefix, iconName, svgInner, suffix) => {
  if (iconName.toLowerCase() === 'logo') {
    // leave logos untouched
    return whole;
  }

  const transformed = svgInner
    // remove any embedded color="…"
    .replace(/\scolor="[^"]*"/g, '')
    // convert fills (except none) to currentColor
    .replace(/\sfill="(?!none)[^"]*"/g, ' fill="currentColor"')
    // convert strokes to currentColor
    .replace(/\sstroke="[^"]*"/g, ' stroke="currentColor"');

  return `${prefix}${transformed}${suffix}`;
});

fs.writeFileSync(iconsFilePath, content, 'utf-8');
console.log(`✅ Updated all icon fills/strokes to currentColor (except logo) in ${ICONS_FILE}`);

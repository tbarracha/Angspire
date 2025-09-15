// generate-ng-icons.js

const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const ICONS_FILE = path.join('src', 'app', 'features', 'icons', 'icons.ts');
const OUTPUT_DIR = path.join('src', 'app', 'features', 'icons', 'components');

const iconsFilePath = path.resolve(process.cwd(), ICONS_FILE);
const outputDir = path.resolve(process.cwd(), OUTPUT_DIR);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const iconsRaw = fs.readFileSync(iconsFilePath, 'utf-8');

// Regex to pull out: static readonly <name>: Icon = { svg: `...`, url: '...' }
const iconRegex = /static readonly (\w+)\s*:\s*Icon\s*=\s*{[\s\S]*?svg\s*:\s*`([\s\S]*?)`,[\s\S]*?url\s*:\s*'([^']*)'/g;

function pascalCase(str) {
  return 'Icon' + str.charAt(0).toUpperCase() + str.slice(1) + 'Component';
}

const iconDefs = [];
let match;
while ((match = iconRegex.exec(iconsRaw))) {
  iconDefs.push({ name: match[1] });
}

function componentTemplate(name) {
  const className = pascalCase(name);
  return `// icon-${name}.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../../../lib/components/ui/icon-component/icon.component';
import { Icons } from '../icons'; // adjust path if necessary

@Component({
  selector: 'icon-${name}',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <app-icon
      [svg]="svg"
      [src]="src"
      [size]="size"
      [padding]="padding"
      [color]="color"
      [strokeColor]="strokeColor"
      [strokeWidth]="strokeWidth"
      [alt]="alt"
      [emoji]="emoji"
    >
      <ng-content />
    </app-icon>
  \`
})
export class ${className} {
  /** icon size in px or CSS unit */
  @Input() size: string | number = 24;

  /** icon padding in px or CSS unit */
  @Input() padding: string | number = 0;

  /** fill color (uses currentColor / inherit) */
  @Input() color: string = 'inherit';

  /** stroke color override (uses currentColor / inherit) */
  @Input() strokeColor: string = 'inherit';

  /** line thickness inside the SVG */
  @Input() strokeWidth: string | number = 1.5;

  /** alt text for accessibility */
  @Input() alt: string = '';

  /** fallback emoji */
  @Input() emoji?: string;

  get svg() { return Icons.${name}.svg; }
  get src() { return Icons.${name}.url; }
}
`;
}


// generate each component file
iconDefs.forEach(icon => {
  const fileName = `icon-${icon.name}.component.ts`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, componentTemplate(icon.name), 'utf-8');
  console.log(`✅ Generated: ${filePath}`);
});

// generate index.ts
const indexTs = iconDefs
  .map(icon => `export { ${pascalCase(icon.name)} } from './icon-${icon.name}.component';`)
  .join('\n') + '\n';

fs.writeFileSync(path.join(outputDir, 'index.ts'), indexTs, 'utf-8');
console.log(`✅ Generated: ${path.join(outputDir, 'index.ts')}`);

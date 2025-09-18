const fs = require('fs');
const path = require('path');

// Always resolve from project root
const baseDir = path.resolve(process.cwd(), 'src/app');
const outputPath = path.resolve(process.cwd(), 'src/app/auto-imports.ts');

const importMap = {
  core: '@core/components',
  shared: '@shared/components',
  pages: '@pages',
};

const collectedImports = [];

function walkComponents(base) {
  const componentsPath = path.join(baseDir, base, 'components');
  if (!fs.existsSync(componentsPath)) return;

  const files = fs.readdirSync(componentsPath);
  files.forEach((file) => {
    if (file.endsWith('.component.ts')) {
      const name = file.replace('.ts', '');
      const importPath = `${importMap[base]}/components/${name}`;
      const importName = toPascalCase(name.replace('.component', ''));
      collectedImports.push(`import { ${importName} } from '${importPath}';`);
    }
  });
}

function walkPagesComponents() {
  const pagesDir = path.join(baseDir, 'pages');
  const pageDirs = fs.readdirSync(pagesDir);

  pageDirs.forEach((page) => {
    const componentsDir = path.join(pagesDir, page, 'components');
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir);
      files.forEach((file) => {
        if (file.endsWith('.component.ts')) {
          const name = file.replace('.ts', '');
          const importPath = `@pages/${page}/components/${name}`;
          const importName = toPascalCase(name.replace('.component', ''));
          collectedImports.push(`import { ${importName} } from '${importPath}';`);
        }
      });
    }
  });
}

function toPascalCase(str) {
  return str.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase());
}

// Execute
walkComponents('core');
walkComponents('shared');
walkPagesComponents();

// Output
fs.writeFileSync(outputPath, collectedImports.join('\n'), 'utf-8');
console.log(`✅ Generated imports in: ${outputPath}`);

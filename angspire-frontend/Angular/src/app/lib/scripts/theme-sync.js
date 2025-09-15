// ----------------------------------------
// theme-sync.js (preserve groups & never miss vars)
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

/* ------------ utilities to extract/replace Theme blocks ------------- */

function extractThemeInner(content, selector) {
  const rx = new RegExp(
    `${selector}\\s*{[\\s\\S]*?/\\*\\s*Theme\\s+START\\s*\\*/([\\s\\S]*?)/\\*\\s*Theme\\s+END\\s*\\*/[\\s\\S]*?}`,
    'm'
  );
  const m = content.match(rx);
  return m ? m[1] : null;
}

function extractThemeBlock(content, selector) {
  const rx = new RegExp(
    `${selector}\\s*{[\\s\\S]*?/\\*\\s*Theme\\s+START\\s*\\*/[\\s\\S]*?/\\*\\s*Theme\\s+END\\s*\\*/[\\s\\S]*?}`,
    'm'
  );
  const m = content.match(rx);
  return m ? m[0] : null;
}

function replaceThemeInner(content, selector, newInner) {
  const rx = new RegExp(
    `(${selector}\\s*{[\\s\\S]*?/\\*\\s*Theme\\s+START\\s*\\*/)([\\s\\S]*?)(/\\*\\s*Theme\\s+END\\s*\\*/[\\s\\S]*?})`,
    'm'
  );
  if (!rx.test(content)) return null;
  return content.replace(rx, (_m, before, _oldInner, after) => `${before}\n${newInner}\n${after}`);
}

function makeBlock(selector, inner) {
  return `${selector} {\n  /* npm run theme update */\n  /* Theme START */\n${inner}\n  /* Theme END */\n}`;
}

/* ------------- parse :root inner → tokens + vars -------------------- */
/**
 * Tokens preserve grouping:
 *  - { type: 'var', name, value, trailing, raw }
 *  - { type: 'keep', raw }   // blank lines or comments
 */
function parseRootInnerToTokens(inner) {
  // Normalize CRLF for safety, but keep original spacing per line.
  const lines = inner.replace(/\r\n/g, '\n').split('\n');

  // Match:  --name: value; [optional trailing stuff]
  // - value may include rgb(...), var(...), hex, etc., but we stop at the first semicolon
  const varRx = /^\s*--([a-zA-Z0-9\-_]+)\s*:\s*([^;]+);(.*)$/;

  const tokens = [];
  const vars = {};
  for (const raw of lines) {
    const m = raw.match(varRx);
    if (m) {
      const name = m[1];
      const valuePart = m[2];
      const trailing = (m[3] || '').trimRight(); // keep spacing/comments after ;
      // Strip inline /* ... */ from the value only
      const value = valuePart.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      tokens.push({ type: 'var', name, value, trailing, raw });
      if (value) vars[name] = value;
    } else {
      tokens.push({ type: 'keep', raw });
    }
  }
  return { tokens, vars };
}

/* ------------- build @theme inner from tokens (preserve groups) ----- */

function buildThemeInnerFromTokens(tokens) {
  const out = [];
  const generated = new Set();

  for (const t of tokens) {
    if (t.type === 'var') {
      const trail = t.trailing ? t.trailing : '';
      out.push(`  --color-${t.name}: var(--${t.name});${trail}`);
      generated.add(t.name);
    } else {
      // keep blank lines & comment separators (indent comments to 2 spaces)
      const trimmed = t.raw.trim();
      if (trimmed === '') {
        out.push('');
      } else if (trimmed.startsWith('/*')) {
        out.push('  ' + trimmed);
      } else {
        // unknown content inside Theme block: keep as blank to avoid leaking CSS
        out.push('');
      }
    }
  }

  // Trim trailing empties
  while (out.length && out[out.length - 1].trim() === '') out.pop();

  return { inner: out.join('\n'), generated };
}

/* ------------- ensure blocks & sync @theme -------------------------- */

function ensureBlocksAndSyncThemeSection() {
  const targetPath = getTargetPath();
  let content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';

  // Preserve header (imports/comments at top)
  const headerMatch = content.match(/^(?:\s*(?:\/\*[\s\S]*?\*\/\s*|@import\s+["'][^"']+["'];\s*)*)/);
  const header = headerMatch ? headerMatch[0] : '';
  let body = content.slice(header.length);

  // Get :root inner or synthesize from defaults
  let rootInner = extractThemeInner(content, ':root');
  let rootBlock = extractThemeBlock(content, ':root');

  if (!rootInner) {
    const inner = Object.entries(defaultRootVars)
      .map(([k, v]) => `  --${k}: ${v};`)
      .join('\n');
    rootBlock = makeBlock(':root', inner);
    rootInner = inner;
  }

  // Parse :root to tokens/vars
  const { tokens, vars } = parseRootInnerToTokens(rootInner);

  // Build @theme inner preserving groups
  const { inner: themeInnerFromTokens, generated } = buildThemeInnerFromTokens(tokens);

  // Append any missing vars (safety net) so we never miss a mapping
  const missing = Object.keys(vars).filter((k) => !generated.has(k));
  let themeInner = themeInnerFromTokens;
  if (missing.length) {
    const appendix =
      (themeInner ? '\n\n' : '') +
      '  /* --- Generated (missing in group order) --- */\n' +
      missing.map((k) => `  --color-${k}: var(--${k});`).join('\n');
    themeInner += appendix;
  }

  // Compose final CSS:
  //  - Keep :root block as-is (format preserved); if it didn't exist, add the one we built.
  //  - Replace only the @theme inner; if block didn't exist, create it after :root.
  const hasRoot = !!extractThemeBlock(content, ':root');
  const hasTheme = !!extractThemeBlock(content, '@theme');

  if (!hasTheme) {
    // Build new @theme from scratch
    const themeBlock = makeBlock('@theme', themeInner);
    const rest = body
      .replace(/:root\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
      .replace(/@theme\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
      .trim();

    let out = header.trimEnd();
    if (out) out += '\n\n';
    out += (hasRoot ? extractThemeBlock(content, ':root') : rootBlock) + '\n\n' + themeBlock;
    if (rest) out += '\n\n' + rest;
    fs.writeFileSync(targetPath, out.trimEnd() + '\n', 'utf-8');
    console.log(`✅ Inserted @theme and synced (preserving groups) in ${path.basename(targetPath)}`);
  } else {
    // Replace @theme inner in-place
    const replaced = replaceThemeInner(content, '@theme', themeInner);
    if (replaced) {
      fs.writeFileSync(targetPath, replaced, 'utf-8');
      console.log(`✅ Synced @theme (preserving groups) in ${path.basename(targetPath)}`);
    } else {
      // Fallback: rebuild both blocks at top (very rare)
      const themeBlock = makeBlock('@theme', themeInner);
      const rest = body
        .replace(/:root\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
        .replace(/@theme\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
        .trim();
      let out = header.trimEnd();
      if (out) out += '\n\n';
      out += (hasRoot ? extractThemeBlock(content, ':root') : rootBlock) + '\n\n' + themeBlock;
      if (rest) out += '\n\n' + rest;
      fs.writeFileSync(targetPath, out.trimEnd() + '\n', 'utf-8');
      console.log(`✅ Rebuilt :root/@theme and synced (fallback) in ${path.basename(targetPath)}`);
    }
  }

  return vars;
}

/* ------------- themes.json (Light-only updates) --------------------- */

function updateThemesJson(vars, themesJsonPath) {
  let themes = [];
  if (fs.existsSync(themesJsonPath)) {
    try {
      const raw = fs.readFileSync(themesJsonPath, 'utf-8');
      const loaded = JSON.parse(raw);
      if (Array.isArray(loaded)) themes = loaded;
    } catch {
      console.warn('Could not parse themes.json, recreating.');
    }
  }

  if (themes.length === 0) {
    themes = [
      { name: 'Light', colors: { ...vars } },
      { name: 'Dark', colors: { ...vars } },
    ];
    fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');
    console.log('✅ Created themes.json with Light & Dark from current vars.');
    return;
  }

  const idxLight = themes.findIndex((t) => (t?.name ?? '').toLowerCase() === 'light');
  let light = idxLight >= 0 ? themes[idxLight] : null;
  if (!light) {
    light = { name: 'Light', colors: {} };
    themes.unshift(light);
    console.log('ℹ️  Light theme not found. Creating it.');
  }
  if (!light.colors || typeof light.colors !== 'object') light.colors = {};

  const changes = [];
  for (const [k, v] of Object.entries(vars)) {
    const oldVal = light.colors[k];
    if (oldVal !== v) {
      light.colors[k] = v;
      changes.push({ key: k, from: oldVal, to: v });
    }
  }

  fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');

  if (changes.length === 0) {
    console.log('✅ Light theme already up to date. No changes written.');
  } else {
    console.log(`✅ Updated Light theme (${changes.length} change${changes.length === 1 ? '' : 's'}):`);
    for (const c of changes) console.log(`   - ${c.key}: ${c.from ?? '(missing)'} → ${c.to}`);
  }
}

/* ------------- main ops -------------------------------------------- */

function syncTheme() {
  const vars = ensureBlocksAndSyncThemeSection();  // regenerate @theme (groups preserved) + never miss vars
  if (vars && Object.keys(vars).length > 0) {
    updateThemesJson(vars, themesJsonPath);        // update Light only
  } else {
    console.log('⚠️  No CSS variables found to sync.');
  }
}

function initStylesFile() {
  // If starting fresh, create both blocks with defaults (one neat group)
  const targetPath = getTargetPath();
  let content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';
  const headerMatch = content.match(/^(?:\s*(?:\/\*[\s\S]*?\*\/\s*|@import\s+["'][^"']+["'];\s*)*)/);
  const header = headerMatch ? headerMatch[0] : '';
  const inner = Object.entries(defaultRootVars).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  const rootBlock = makeBlock(':root', inner);
  const themeBlock = makeBlock('@theme', Object.keys(defaultRootVars).map((k) => `  --color-${k}: var(--${k});`).join('\n'));
  let out = header.trimEnd();
  if (out) out += '\n\n';
  out += rootBlock + '\n\n' + themeBlock + '\n';
  fs.writeFileSync(targetPath, out, 'utf-8');
  console.log(`✅ Initialized ${path.basename(targetPath)} with :root and @theme.`);
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

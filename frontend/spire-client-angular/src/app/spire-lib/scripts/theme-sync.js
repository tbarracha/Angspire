// ----------------------------------------
// theme-sync.js (Angular-friendly, preserves groups, syncs Light & Dark)
// Syncs theme colors between :root, @theme, and themes.json
// Also ensures default metrics (radius/borderWidth/ringWidth) exist in themes.json
// Only edits values inside /* Theme START */ and /* Theme END */ blocks
// ----------------------------------------

const fs = require('fs');
const path = require('path');

/** Resolve paths (prefer Angular assets) */
const cssScssPath = path.resolve(process.cwd(), 'src/styles.scss');
const cssPath = path.resolve(process.cwd(), 'src/styles.css');
const possibleCssPaths = [cssScssPath, cssPath];

const themesJsonCandidates = [
  path.resolve(process.cwd(), 'src/assets/themes.json'),
  path.resolve(process.cwd(), 'public/themes.json'),
  path.resolve(process.cwd(), 'themes.json'),
];

/** Default metrics we want to guarantee in themes.json */
const DEFAULT_METRICS = {
  radius: {
    xm:  '0.125rem',
    sm:  '0.25rem',
    md:  '0.5rem',
    lg:  '0.75rem',
    xlg: '1rem',
    pill:'9999px',
  },
  borderWidth: {
    none: '0',
    hairline: '1px',
    base: '2px',
    thick: '3px',
  },
  ringWidth: {
    none: '0',
    subtle: '1px',
    focus: '2px',
    strong: '3px',
  },
};

/** Choose existing CSS file or default */
function getTargetCssPath() {
  return possibleCssPaths.find(fs.existsSync) || cssPath;
}
/** Choose themes.json location; prefer first existing; else first candidate */
function getThemesJsonPath() {
  const existing = themesJsonCandidates.find(fs.existsSync);
  return existing || themesJsonCandidates[0];
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
  const lines = inner.replace(/\r\n/g, '\n').split('\n');
  const varRx = /^\s*--([a-zA-Z0-9\-_]+)\s*:\s*([^;]+);(.*)$/;

  const tokens = [];
  const vars = {};
  for (const raw of lines) {
    const m = raw.match(varRx);
    if (m) {
      const name = m[1];
      const valuePart = m[2];
      const trailing = (m[3] || '').trimEnd();
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
  for (const t of tokens) {
    if (t.type === 'var') {
      const trail = t.trailing ? t.trailing : '';
      out.push(`  --color-${t.name}: var(--${t.name});${trail}`);
    } else {
      const trimmed = t.raw.trim();
      if (trimmed === '') out.push('');
      else if (trimmed.startsWith('/*')) out.push('  ' + trimmed);
      else out.push('');
    }
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  return out.join('\n');
}

/* ------------- ensure blocks & sync @theme -------------------------- */
function ensureBlocksAndSyncThemeSection() {
  const targetPath = getTargetCssPath();
  let content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';

  const headerMatch = content.match(/^(?:\s*(?:\/\*[\s\S]*?\*\/\s*|@import\s+["'][^"']+["'];\s*)*)/);
  const header = headerMatch ? headerMatch[0] : '';
  const body = content.slice(header.length);

  let rootInner = extractThemeInner(content, ':root');
  let rootBlock = extractThemeBlock(content, ':root');

  if (!rootInner) {
    console.error('❌ No ":root { /* Theme START/END */ }" block found. Aborting.');
    process.exitCode = 1;
    return null;
  }

  const { tokens, vars } = parseRootInnerToTokens(rootInner);
  const themeInner = buildThemeInnerFromTokens(tokens);

  const hasTheme = !!extractThemeBlock(content, '@theme');
  if (!hasTheme) {
    const themeBlock = makeBlock('@theme', themeInner);
    // Remove any old blocks (defensive)
    const rest = body
      .replace(/:root\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
      .replace(/@theme\s*{[\s\S]*?\/\* Theme START \*\/[\s\S]*?\/\* Theme END \*\/[\s\S]*?}/g, '')
      .trim();

    let out = header.trimEnd();
    if (out) out += '\n\n';
    out += (rootBlock || makeBlock(':root', rootInner)) + '\n\n' + themeBlock;
    if (rest) out += '\n\n' + rest;
    fs.writeFileSync(targetPath, out.trimEnd() + '\n', 'utf-8');
    console.log(`✅ Inserted @theme and synced in ${path.basename(targetPath)}`);
  } else {
    const replaced = replaceThemeInner(content, '@theme', themeInner);
    if (replaced) {
      fs.writeFileSync(targetPath, replaced, 'utf-8');
      console.log(`✅ Synced @theme in ${path.basename(targetPath)}`);
    } else {
      console.warn('⚠️ Failed to replace @theme inner; leaving file unchanged.');
    }
  }

  return vars; // dictionary of --var-name => value (without the --)
}

/* ------------- themes.json (Light + Dark updates + metrics) -------- */

function ensureThemeObject(themes, name) {
  const idx = themes.findIndex(t => (t?.name ?? '').toLowerCase() === name.toLowerCase());
  if (idx >= 0) return themes[idx];
  const created = { name, colors: {} };
  name.toLowerCase() === 'light' ? themes.unshift(created) : themes.push(created);
  console.log(`ℹ️ ${name} theme not found. Creating it.`);
  return created;
}

function ensureMetricsDefaults(theme) {
  if (!theme) return { createdFamilies: 0, filledTokens: 0 };
  theme.metrics = theme.metrics && typeof theme.metrics === 'object' ? theme.metrics : {};

  let createdFamilies = 0;
  let filledTokens = 0;

  for (const fam of Object.keys(DEFAULT_METRICS)) {
    const defaults = DEFAULT_METRICS[fam];
    const target = (theme.metrics[fam] && typeof theme.metrics[fam] === 'object')
      ? theme.metrics[fam]
      : (theme.metrics[fam] = {}, createdFamilies++, theme.metrics[fam]);

    for (const [k, v] of Object.entries(defaults)) {
      if (!(k in target)) {
        target[k] = v;
        filledTokens++;
      }
    }
  }
  return { createdFamilies, filledTokens };
}

function updateThemesJsonFromRootVars(vars, themesJsonPath) {
  let themes = [];
  if (fs.existsSync(themesJsonPath)) {
    try {
      const raw = fs.readFileSync(themesJsonPath, 'utf-8');
      const loaded = JSON.parse(raw);
      if (Array.isArray(loaded)) themes = loaded;
      else console.warn('⚠️ themes.json is not an array; recreating.');
    } catch {
      console.warn('⚠️ Could not parse themes.json; recreating.');
    }
  }

  // Ensure Light + Dark shells
  const light = ensureThemeObject(themes, 'Light');
  const dark  = ensureThemeObject(themes, 'Dark');

  // Ensure colors object
  if (!light.colors || typeof light.colors !== 'object') light.colors = {};
  if (!dark.colors  || typeof dark.colors  !== 'object') dark.colors  = {};

  // Update Light from root vars (overwrite with canonical defaults from :root)
  const lightChanges = [];
  for (const [k, v] of Object.entries(vars)) {
    const old = light.colors[k];
    if (old !== v) {
      light.colors[k] = v;
      lightChanges.push({ k, old, v });
    }
  }

  // Fill Dark missing keys from Light (do not override Dark’s existing)
  let filled = 0;
  for (const [k, v] of Object.entries(light.colors)) {
    if (dark.colors[k] == null) {
      dark.colors[k] = v;
      filled++;
    }
  }
  if (filled > 0) console.log(`ℹ️ Filled ${filled} missing Dark color keys from Light.`);

  // ✅ Ensure default metrics on both Light and Dark (non-destructive)
  const lm = ensureMetricsDefaults(light);
  const dm = ensureMetricsDefaults(dark);
  if (lm.createdFamilies || lm.filledTokens) {
    console.log(`✅ Light metrics ensured (${lm.createdFamilies} families, ${lm.filledTokens} tokens).`);
  } else {
    console.log('✅ Light metrics already complete.');
  }
  if (dm.createdFamilies || dm.filledTokens) {
    console.log(`✅ Dark metrics ensured (${dm.createdFamilies} families, ${dm.filledTokens} tokens).`);
  } else {
    console.log('✅ Dark metrics already complete.');
  }

  fs.writeFileSync(themesJsonPath, JSON.stringify(themes, null, 2), 'utf-8');

  if (lightChanges.length === 0) {
    console.log('✅ Light colors up to date.');
  } else {
    console.log(`✅ Updated Light colors (${lightChanges.length} change${lightChanges.length === 1 ? '' : 's'}).`);
  }
}

/* ------------- main ops -------------------------------------------- */

function syncTheme() {
  const vars = ensureBlocksAndSyncThemeSection();
  if (!vars || Object.keys(vars).length === 0) {
    console.log('⚠️ No CSS variables found in :root Theme block; nothing to sync.');
    // Still ensure themes.json exists with metrics defaults
    const themesJsonPath = getThemesJsonPath();
    fs.mkdirSync(path.dirname(themesJsonPath), { recursive: true });
    updateThemesJsonFromRootVars({}, themesJsonPath);
    return;
  }

  const themesJsonPath = getThemesJsonPath();
  // Ensure directory exists
  fs.mkdirSync(path.dirname(themesJsonPath), { recursive: true });
  updateThemesJsonFromRootVars(vars, themesJsonPath);

  // Heads-up for potentially missing tokens referenced elsewhere
  warnIfCommonMissing(vars);
}

function initStylesFile() {
  const targetPath = getTargetCssPath();
  if (fs.existsSync(targetPath)) {
    console.log(`ℹ️ ${path.basename(targetPath)} already exists. Run "npm run theme update" instead.`);
    return;
  }
  const rootInner = [
    '  /* Add your theme vars here; then run npm run theme update */',
    '  /* Example colors: */',
    '  --primary: #fbbf24;',
    '  --primary-content: #713f12;',
  ].join('\n');
  const rootBlock = makeBlock(':root', rootInner);
  const themeBlock = makeBlock('@theme', '  --color-primary: var(--primary);\n  --color-primary-content: var(--primary-content);');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${rootBlock}\n\n${themeBlock}\n`, 'utf-8');
  console.log(`✅ Initialized ${path.basename(targetPath)} with :root and @theme skeletons.`);
}

function clearThemes() {
  const themesJsonPath = getThemesJsonPath();
  fs.writeFileSync(themesJsonPath, '[]', 'utf-8');
  console.log(`🧹 Cleared ${path.relative(process.cwd(), themesJsonPath)}.`);
}

/** Optional: warn about commonly referenced-but-missing tokens */
function warnIfCommonMissing(vars) {
  const maybeMissing = [
    'scrollbar-track-hover',
    'scrollbar-thumb-hover',
  ];
  const missing = maybeMissing.filter((k) => !(k in vars));
  if (missing.length) {
    console.warn(`⚠️ Missing tokens in :root that your CSS may reference: ${missing.join(', ')}`);
  }
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
    console.log('Usage: npm run theme <command>');
    console.log('  update → regenerate @theme and sync themes.json (Light & Dark, colors + metrics defaults)');
    console.log('  clear  → clear all theme entries in themes.json');
    console.log('  init   → create styles file with :root and @theme skeletons');
    break;
}

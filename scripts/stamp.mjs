// Actualiza las versiones (?v=) para que los teléfonos descarguen los archivos nuevos.
// Uso: node scripts/stamp.mjs   (correrlo después de editar public/import.js o public/app.js)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10);
const swap = (file, re, value) => {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(re, value);
  if (!re.test(before)) throw new Error(`No encontré ${re} en ${file}`);
  writeFileSync(file, after);
};
swap('public/app.js', /import\.js\?v=[A-Za-z0-9_]+/, `import.js?v=${hash('public/import.js')}`);
swap('public/index.html', /app\.js\?v=[A-Za-z0-9_]+/, `app.js?v=${hash('public/app.js')}`);
console.log('import.js', hash('public/import.js'), '· app.js', hash('public/app.js'));

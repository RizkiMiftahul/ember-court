import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
function listCopiedFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCopiedFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}
mkdirSync(output, { recursive: true });
for (const name of ['game', 'screenshots']) {
  rmSync(resolve(output, name), { recursive: true, force: true });
  cpSync(resolve(root, name), resolve(output, name), { recursive: true, dereference: false });
}
const copied = ['game', 'screenshots'].flatMap(name => listCopiedFiles(resolve(output, name)));
console.log(`copied ${copied.length} files, ${copied.reduce((bytes, path) => bytes + statSync(path).size, 0)} bytes`);
writeFileSync(resolve(output, 'dossier.json'), buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
}));


/**
 * resolve-amplify-symlinks.js
 *
 * Workaround for Next.js 16.x + Turbopack on AWS Amplify Hosting.
 *
 * Turbopack creates symlinks in .next/node_modules/ that point to packages
 * in the parent node_modules/. Amplify's build bundler cannot follow these
 * symlinks, causing the deployment to fail.
 *
 * This script runs after `next build` and replaces each symlink with a real
 * copy of the target directory.
 *
 * See: https://github.com/aws-amplify/amplify-hosting/issues/4074
 *
 * Usage (from frontend/):
 *   node ../scripts/resolve-amplify-symlinks.js
 */

const fs = require("fs");
const path = require("path");

const NEXT_NODE_MODULES = path.join(process.cwd(), ".next", "node_modules");

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function resolveSymlinks() {
  if (!fs.existsSync(NEXT_NODE_MODULES)) {
    console.log(
      "[resolve-amplify-symlinks] No .next/node_modules/ found — nothing to do."
    );
    return;
  }

  const entries = fs.readdirSync(NEXT_NODE_MODULES, { withFileTypes: true });
  let resolved = 0;

  for (const entry of entries) {
    const entryPath = path.join(NEXT_NODE_MODULES, entry.name);

    if (!entry.isSymbolicLink()) {
      continue;
    }

    const realPath = fs.realpathSync(entryPath);
    console.log(
      `[resolve-amplify-symlinks] Resolving: ${entry.name} -> ${realPath}`
    );

    // Remove the symlink
    fs.rmSync(entryPath);

    // Copy the real directory/file in its place
    const stat = fs.statSync(realPath);
    if (stat.isDirectory()) {
      copyDirSync(realPath, entryPath);
    } else {
      fs.copyFileSync(realPath, entryPath);
    }

    resolved++;
  }

  console.log(
    `[resolve-amplify-symlinks] Done. Resolved ${resolved} symlink(s).`
  );
}

resolveSymlinks();

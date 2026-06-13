import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.join(__dirname, '../workspace');

// Ensure directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

export const workspaceService = {
  // Get a tree of all files in the workspace
  getFileTree() {
    const getFiles = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      return items.map(item => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          return { name: item.name, type: 'directory', children: getFiles(fullPath) };
        }
        return { name: item.name, type: 'file', path: path.relative(WORKSPACE_DIR, fullPath) };
      });
    };
    return getFiles(WORKSPACE_DIR);
  },

  // Read file content
  readFile(filePath) {
    const safePath = path.join(WORKSPACE_DIR, filePath);
    if (!safePath.startsWith(WORKSPACE_DIR)) throw new Error('Invalid path');
    return fs.readFileSync(safePath, 'utf-8');
  },

  // Write or update file content
  writeFile(filePath, content) {
    const safePath = path.join(WORKSPACE_DIR, filePath);
    if (!safePath.startsWith(WORKSPACE_DIR)) throw new Error('Invalid path');
    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, content, 'utf-8');
    return { success: true, path: filePath };
  },

  // Delete a file or directory
  deleteFile(filePath) {
    const safePath = path.join(WORKSPACE_DIR, filePath);
    if (!safePath.startsWith(WORKSPACE_DIR)) throw new Error('Invalid path');
    fs.rmSync(safePath, { recursive: true, force: true });
    return { success: true };
  },
  
  // Clear entire workspace
  clearWorkspace() {
    fs.rmSync(WORKSPACE_DIR, { recursive: true, force: true });
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    return { success: true };
  }
};
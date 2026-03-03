"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildFileEntry = buildFileEntry;exports.chunkMarkdown = chunkMarkdown;exports.cosineSimilarity = cosineSimilarity;exports.ensureDir = ensureDir;exports.hashText = hashText;exports.isMemoryPath = isMemoryPath;exports.listMemoryFiles = listMemoryFiles;exports.normalizeExtraMemoryPaths = normalizeExtraMemoryPaths;exports.normalizeRelPath = normalizeRelPath;exports.parseEmbedding = parseEmbedding;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function ensureDir(dir) {
  try {
    _nodeFs.default.mkdirSync(dir, { recursive: true });
  }
  catch {}
  return dir;
}
function normalizeRelPath(value) {
  const trimmed = value.trim().replace(/^[./]+/, "");
  return trimmed.replace(/\\/g, "/");
}
function normalizeExtraMemoryPaths(workspaceDir, extraPaths) {
  if (!extraPaths?.length) {
    return [];
  }
  const resolved = extraPaths.
  map((value) => value.trim()).
  filter(Boolean).
  map((value) => _nodePath.default.isAbsolute(value) ? _nodePath.default.resolve(value) : _nodePath.default.resolve(workspaceDir, value));
  return Array.from(new Set(resolved));
}
function isMemoryPath(relPath) {
  const normalized = normalizeRelPath(relPath);
  if (!normalized) {
    return false;
  }
  if (normalized === "MEMORY.md" || normalized === "memory.md") {
    return true;
  }
  return normalized.startsWith("memory/");
}
async function walkDir(dir, files) {
  const entries = await _promises.default.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = _nodePath.default.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      await walkDir(full, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".md")) {
      continue;
    }
    files.push(full);
  }
}
async function listMemoryFiles(workspaceDir, extraPaths) {
  const result = [];
  const memoryFile = _nodePath.default.join(workspaceDir, "MEMORY.md");
  const altMemoryFile = _nodePath.default.join(workspaceDir, "memory.md");
  const memoryDir = _nodePath.default.join(workspaceDir, "memory");
  const addMarkdownFile = async (absPath) => {
    try {
      const stat = await _promises.default.lstat(absPath);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        return;
      }
      if (!absPath.endsWith(".md")) {
        return;
      }
      result.push(absPath);
    }
    catch {}
  };
  await addMarkdownFile(memoryFile);
  await addMarkdownFile(altMemoryFile);
  try {
    const dirStat = await _promises.default.lstat(memoryDir);
    if (!dirStat.isSymbolicLink() && dirStat.isDirectory()) {
      await walkDir(memoryDir, result);
    }
  }
  catch {}
  const normalizedExtraPaths = normalizeExtraMemoryPaths(workspaceDir, extraPaths);
  if (normalizedExtraPaths.length > 0) {
    for (const inputPath of normalizedExtraPaths) {
      try {
        const stat = await _promises.default.lstat(inputPath);
        if (stat.isSymbolicLink()) {
          continue;
        }
        if (stat.isDirectory()) {
          await walkDir(inputPath, result);
          continue;
        }
        if (stat.isFile() && inputPath.endsWith(".md")) {
          result.push(inputPath);
        }
      }
      catch {}
    }
  }
  if (result.length <= 1) {
    return result;
  }
  const seen = new Set();
  const deduped = [];
  for (const entry of result) {
    let key = entry;
    try {
      key = await _promises.default.realpath(entry);
    }
    catch {}
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}
function hashText(value) {
  return _nodeCrypto.default.createHash("sha256").update(value).digest("hex");
}
async function buildFileEntry(absPath, workspaceDir) {
  const stat = await _promises.default.stat(absPath);
  const content = await _promises.default.readFile(absPath, "utf-8");
  const hash = hashText(content);
  return {
    path: _nodePath.default.relative(workspaceDir, absPath).replace(/\\/g, "/"),
    absPath,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    hash
  };
}
function chunkMarkdown(content, chunking) {
  const lines = content.split("\n");
  if (lines.length === 0) {
    return [];
  }
  const maxChars = Math.max(32, chunking.tokens * 4);
  const overlapChars = Math.max(0, chunking.overlap * 4);
  const chunks = [];
  let current = [];
  let currentChars = 0;
  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const firstEntry = current[0];
    const lastEntry = current[current.length - 1];
    if (!firstEntry || !lastEntry) {
      return;
    }
    const text = current.map((entry) => entry.line).join("\n");
    const startLine = firstEntry.lineNo;
    const endLine = lastEntry.lineNo;
    chunks.push({
      startLine,
      endLine,
      text,
      hash: hashText(text)
    });
  };
  const carryOverlap = () => {
    if (overlapChars <= 0 || current.length === 0) {
      current = [];
      currentChars = 0;
      return;
    }
    let acc = 0;
    const kept = [];
    for (let i = current.length - 1; i >= 0; i -= 1) {
      const entry = current[i];
      if (!entry) {
        continue;
      }
      acc += entry.line.length + 1;
      kept.unshift(entry);
      if (acc >= overlapChars) {
        break;
      }
    }
    current = kept;
    currentChars = kept.reduce((sum, entry) => sum + entry.line.length + 1, 0);
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    const segments = [];
    if (line.length === 0) {
      segments.push("");
    } else
    {
      for (let start = 0; start < line.length; start += maxChars) {
        segments.push(line.slice(start, start + maxChars));
      }
    }
    for (const segment of segments) {
      const lineSize = segment.length + 1;
      if (currentChars + lineSize > maxChars && current.length > 0) {
        flush();
        carryOverlap();
      }
      current.push({ line: segment, lineNo });
      currentChars += lineSize;
    }
  }
  flush();
  return chunks;
}
function parseEmbedding(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }
  catch {
    return [];
  }
}
function cosineSimilarity(a, b) {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
} /* v9-5dd5aad04a9525da */

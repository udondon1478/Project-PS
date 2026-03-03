"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatSkillsForPrompt = formatSkillsForPrompt;exports.loadSkills = loadSkills;exports.loadSkillsFromDir = loadSkillsFromDir;var _fs = require("fs");
var _os = require("os");
var _path = require("path");
var _config = require("../config.js");
var _frontmatter = require("../utils/frontmatter.js");
/**
 * Standard frontmatter fields per Agent Skills spec.
 * See: https://agentskills.io/specification#frontmatter-required
 */
const ALLOWED_FRONTMATTER_FIELDS = new Set([
"name",
"description",
"license",
"compatibility",
"metadata",
"allowed-tools",
"disable-model-invocation"]
);
/** Max name length per spec */
const MAX_NAME_LENGTH = 64;
/** Max description length per spec */
const MAX_DESCRIPTION_LENGTH = 1024;
/**
 * Validate skill name per Agent Skills spec.
 * Returns array of validation error messages (empty if valid).
 */
function validateName(name, parentDirName) {
  const errors = [];
  if (name !== parentDirName) {
    errors.push(`name "${name}" does not match parent directory "${parentDirName}"`);
  }
  if (name.length > MAX_NAME_LENGTH) {
    errors.push(`name exceeds ${MAX_NAME_LENGTH} characters (${name.length})`);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push(`name contains invalid characters (must be lowercase a-z, 0-9, hyphens only)`);
  }
  if (name.startsWith("-") || name.endsWith("-")) {
    errors.push(`name must not start or end with a hyphen`);
  }
  if (name.includes("--")) {
    errors.push(`name must not contain consecutive hyphens`);
  }
  return errors;
}
/**
 * Validate description per Agent Skills spec.
 */
function validateDescription(description) {
  const errors = [];
  if (!description || description.trim() === "") {
    errors.push("description is required");
  } else
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`description exceeds ${MAX_DESCRIPTION_LENGTH} characters (${description.length})`);
  }
  return errors;
}
/**
 * Check for unknown frontmatter fields.
 */
function validateFrontmatterFields(keys) {
  const errors = [];
  for (const key of keys) {
    if (!ALLOWED_FRONTMATTER_FIELDS.has(key)) {
      errors.push(`unknown frontmatter field "${key}"`);
    }
  }
  return errors;
}
/**
 * Load skills from a directory.
 *
 * Discovery rules:
 * - direct .md children in the root
 * - recursive SKILL.md under subdirectories
 */
function loadSkillsFromDir(options) {
  const { dir, source } = options;
  return loadSkillsFromDirInternal(dir, source, true);
}
function loadSkillsFromDirInternal(dir, source, includeRootFiles) {
  const skills = [];
  const diagnostics = [];
  if (!(0, _fs.existsSync)(dir)) {
    return { skills, diagnostics };
  }
  try {
    const entries = (0, _fs.readdirSync)(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      // Skip node_modules to avoid scanning dependencies
      if (entry.name === "node_modules") {
        continue;
      }
      const fullPath = (0, _path.join)(dir, entry.name);
      // For symlinks, check if they point to a directory and follow them
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          const stats = (0, _fs.statSync)(fullPath);
          isDirectory = stats.isDirectory();
          isFile = stats.isFile();
        }
        catch {
          // Broken symlink, skip it
          continue;
        }
      }
      if (isDirectory) {
        const subResult = loadSkillsFromDirInternal(fullPath, source, false);
        skills.push(...subResult.skills);
        diagnostics.push(...subResult.diagnostics);
        continue;
      }
      if (!isFile) {
        continue;
      }
      const isRootMd = includeRootFiles && entry.name.endsWith(".md");
      const isSkillMd = !includeRootFiles && entry.name === "SKILL.md";
      if (!isRootMd && !isSkillMd) {
        continue;
      }
      const result = loadSkillFromFile(fullPath, source);
      if (result.skill) {
        skills.push(result.skill);
      }
      diagnostics.push(...result.diagnostics);
    }
  }
  catch {}
  return { skills, diagnostics };
}
function loadSkillFromFile(filePath, source) {
  const diagnostics = [];
  try {
    const rawContent = (0, _fs.readFileSync)(filePath, "utf-8");
    const { frontmatter } = (0, _frontmatter.parseFrontmatter)(rawContent);
    const allKeys = Object.keys(frontmatter);
    const skillDir = (0, _path.dirname)(filePath);
    const parentDirName = (0, _path.basename)(skillDir);
    // Validate frontmatter fields
    const fieldErrors = validateFrontmatterFields(allKeys);
    for (const error of fieldErrors) {
      diagnostics.push({ type: "warning", message: error, path: filePath });
    }
    // Validate description
    const descErrors = validateDescription(frontmatter.description);
    for (const error of descErrors) {
      diagnostics.push({ type: "warning", message: error, path: filePath });
    }
    // Use name from frontmatter, or fall back to parent directory name
    const name = frontmatter.name || parentDirName;
    // Validate name
    const nameErrors = validateName(name, parentDirName);
    for (const error of nameErrors) {
      diagnostics.push({ type: "warning", message: error, path: filePath });
    }
    // Still load the skill even with warnings (unless description is completely missing)
    if (!frontmatter.description || frontmatter.description.trim() === "") {
      return { skill: null, diagnostics };
    }
    return {
      skill: {
        name,
        description: frontmatter.description,
        filePath,
        baseDir: skillDir,
        source,
        disableModelInvocation: frontmatter["disable-model-invocation"] === true
      },
      diagnostics
    };
  }
  catch (error) {
    const message = error instanceof Error ? error.message : "failed to parse skill file";
    diagnostics.push({ type: "warning", message, path: filePath });
    return { skill: null, diagnostics };
  }
}
/**
 * Format skills for inclusion in a system prompt.
 * Uses XML format per Agent Skills standard.
 * See: https://agentskills.io/integrate-skills
 *
 * Skills with disableModelInvocation=true are excluded from the prompt
 * (they can only be invoked explicitly via /skill:name commands).
 */
function formatSkillsForPrompt(skills) {
  const visibleSkills = skills.filter((s) => !s.disableModelInvocation);
  if (visibleSkills.length === 0) {
    return "";
  }
  const lines = [
  "\n\nThe following skills provide specialized instructions for specific tasks.",
  "Use the read tool to load a skill's file when the task matches its description.",
  "When a skill file references a relative path, resolve it against the skill directory (parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.",
  "",
  "<available_skills>"];

  for (const skill of visibleSkills) {
    lines.push("  <skill>");
    lines.push(`    <name>${escapeXml(skill.name)}</name>`);
    lines.push(`    <description>${escapeXml(skill.description)}</description>`);
    lines.push(`    <location>${escapeXml(skill.filePath)}</location>`);
    lines.push("  </skill>");
  }
  lines.push("</available_skills>");
  return lines.join("\n");
}
function escapeXml(str) {
  return str.
  replace(/&/g, "&amp;").
  replace(/</g, "&lt;").
  replace(/>/g, "&gt;").
  replace(/"/g, "&quot;").
  replace(/'/g, "&apos;");
}
function normalizePath(input) {
  const trimmed = input.trim();
  if (trimmed === "~")
  return (0, _os.homedir)();
  if (trimmed.startsWith("~/"))
  return (0, _path.join)((0, _os.homedir)(), trimmed.slice(2));
  if (trimmed.startsWith("~"))
  return (0, _path.join)((0, _os.homedir)(), trimmed.slice(1));
  return trimmed;
}
function resolveSkillPath(p, cwd) {
  const normalized = normalizePath(p);
  return (0, _path.isAbsolute)(normalized) ? normalized : (0, _path.resolve)(cwd, normalized);
}
/**
 * Load skills from all configured locations.
 * Returns skills and any validation diagnostics.
 */
function loadSkills(options = {}) {
  const { cwd = process.cwd(), agentDir, skillPaths = [], includeDefaults = true } = options;
  // Resolve agentDir - if not provided, use default from config
  const resolvedAgentDir = agentDir ?? (0, _config.getAgentDir)();
  const skillMap = new Map();
  const realPathSet = new Set();
  const allDiagnostics = [];
  const collisionDiagnostics = [];
  function addSkills(result) {
    allDiagnostics.push(...result.diagnostics);
    for (const skill of result.skills) {
      // Resolve symlinks to detect duplicate files
      let realPath;
      try {
        realPath = (0, _fs.realpathSync)(skill.filePath);
      }
      catch {
        realPath = skill.filePath;
      }
      // Skip silently if we've already loaded this exact file (via symlink)
      if (realPathSet.has(realPath)) {
        continue;
      }
      const existing = skillMap.get(skill.name);
      if (existing) {
        collisionDiagnostics.push({
          type: "collision",
          message: `name "${skill.name}" collision`,
          path: skill.filePath,
          collision: {
            resourceType: "skill",
            name: skill.name,
            winnerPath: existing.filePath,
            loserPath: skill.filePath
          }
        });
      } else
      {
        skillMap.set(skill.name, skill);
        realPathSet.add(realPath);
      }
    }
  }
  if (includeDefaults) {
    addSkills(loadSkillsFromDirInternal((0, _path.join)(resolvedAgentDir, "skills"), "user", true));
    addSkills(loadSkillsFromDirInternal((0, _path.resolve)(cwd, _config.CONFIG_DIR_NAME, "skills"), "project", true));
  }
  const userSkillsDir = (0, _path.join)(resolvedAgentDir, "skills");
  const projectSkillsDir = (0, _path.resolve)(cwd, _config.CONFIG_DIR_NAME, "skills");
  const isUnderPath = (target, root) => {
    const normalizedRoot = (0, _path.resolve)(root);
    if (target === normalizedRoot) {
      return true;
    }
    const prefix = normalizedRoot.endsWith(_path.sep) ? normalizedRoot : `${normalizedRoot}${_path.sep}`;
    return target.startsWith(prefix);
  };
  const getSource = (resolvedPath) => {
    if (!includeDefaults) {
      if (isUnderPath(resolvedPath, userSkillsDir))
      return "user";
      if (isUnderPath(resolvedPath, projectSkillsDir))
      return "project";
    }
    return "path";
  };
  for (const rawPath of skillPaths) {
    const resolvedPath = resolveSkillPath(rawPath, cwd);
    if (!(0, _fs.existsSync)(resolvedPath)) {
      allDiagnostics.push({ type: "warning", message: "skill path does not exist", path: resolvedPath });
      continue;
    }
    try {
      const stats = (0, _fs.statSync)(resolvedPath);
      const source = getSource(resolvedPath);
      if (stats.isDirectory()) {
        addSkills(loadSkillsFromDirInternal(resolvedPath, source, true));
      } else
      if (stats.isFile() && resolvedPath.endsWith(".md")) {
        const result = loadSkillFromFile(resolvedPath, source);
        if (result.skill) {
          addSkills({ skills: [result.skill], diagnostics: result.diagnostics });
        } else
        {
          allDiagnostics.push(...result.diagnostics);
        }
      } else
      {
        allDiagnostics.push({ type: "warning", message: "skill path is not a markdown file", path: resolvedPath });
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "failed to read skill path";
      allDiagnostics.push({ type: "warning", message, path: resolvedPath });
    }
  }
  return {
    skills: Array.from(skillMap.values()),
    diagnostics: [...allDiagnostics, ...collisionDiagnostics]
  };
} /* v9-9e16cc12105b8f1f */

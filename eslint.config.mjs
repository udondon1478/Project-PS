import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "e2e/**",
    "remotion/**",
    "scripts/**",
    "prisma/**",
    "debug-product.js",
  ]),
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // react-hooks v7 の新ルール: 既存コードに多数該当するため warn に緩和
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/error-boundaries": "warn",
      // 既存コードに any が多数あるため段階的に修正するために warn に緩和
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;

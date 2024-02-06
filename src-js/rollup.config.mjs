// External Dependencies:
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "src/index.ts",
    output: {
      name: "trp",
      file: "dist/browser/trp.min.js",
      format: "iife",
      sourcemap: true,
      plugins: [
        terser({
          keep_classnames: true,
          keep_fnames: true,
        }),
      ],
    },
    plugins: [
      resolve({ extensions: [".js", ".json", ".ts"] }),
      typescript({ tsconfig: "tsconfig.browser.json" }),
    ],
  },
];

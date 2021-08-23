// External Dependencies:
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

// Local Dependencies:
import pkg from "./package.json";

export default [
  {
    input: "dist/cjs/index.js",
    output: {
      name: "trp",
      file: pkg.browser,
      format: "iife",
      sourcemap: true,
      plugins: [
        terser({
          keep_classnames: true,
          keep_fnames: true,
        }),
      ],
    },
    plugins: [resolve(), commonjs()],
  },
];

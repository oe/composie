import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
const { increaseVersion } = require("./build/update-pkg-version.js");
const newVer = increaseVersion(pkg.version);

export default {
  input: "src/composie.ts",
  output: {
    name: "Composie",
    banner: `/*!
 * Composie v${newVer}
 * Copyright© ${new Date().getFullYear()} Saiya ${pkg.homepage}
 */`,
    format: process.env.format,
    file: `dist/composie.${process.env.format}.js`
  },
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: { module: "esnext" }
      },
      typescript: require("typescript")
    })
  ]
};

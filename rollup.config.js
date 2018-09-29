import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";

export default {
  input: "src/composie.ts",
  output: {
    name: "composie",
    banner: `/*!
 * composie v${pkg.version}
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
  ],
  external: ["cheerio"]
};

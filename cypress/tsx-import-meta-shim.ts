import Module from 'node:module';

/**
 * Workaround for the "regular" (webpack) setup on Angular 22.
 *
 * Cypress runs the config process with `NODE_OPTIONS=--import tsx/dist/loader.mjs` and its Angular
 * handler loads @angular-devkit/build-angular through tsx. build-angular 22 requires the ESM-only
 * Babel 8 packages; tsx's CJS hook transpiles them to CJS with esbuild, which turns `import.meta`
 * into an empty object (`const import_meta={};`). Babel then calls `createRequire(undefined)` and
 * every module fails with "[BABEL] …: The argument 'filename' must be a file URL object, file URL
 * string, or absolute path string. Received undefined".
 *
 * This patch restores `import.meta.url` in tsx's output for node_modules files only.
 */
const EMPTY_IMPORT_META = /const import_meta\s*=\s*\{\};/;
const proto = Module.prototype as unknown as { _compile(content: string, filename: string): unknown; __importMetaShim?: boolean };

export const installTsxImportMetaShim = (): void => {
  if (proto.__importMetaShim) return;
  proto.__importMetaShim = true;
  const original = proto._compile;
  proto._compile = function (content: string, filename: string) {
    if (filename.includes('/node_modules/') && EMPTY_IMPORT_META.test(content)) {
      content = content.replace(
        EMPTY_IMPORT_META,
        'const import_meta = { url: require("node:url").pathToFileURL(__filename).href, dirname: __dirname, filename: __filename };',
      );
    }
    return original.call(this, content, filename);
  };
};

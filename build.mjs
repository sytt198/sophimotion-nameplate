import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({absWorkingDir:process.cwd(),entryPoints:[fileURLToPath(new URL('./src/app.js',import.meta.url))],bundle:true,format:'esm',minify:true,outfile:'dist/app.js',tsconfigRaw:{compilerOptions:{}}});

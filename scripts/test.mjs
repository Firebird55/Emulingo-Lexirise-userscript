import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['src/manager.ts'],outfile:'.test-build/manager.js',bundle:true,platform:'browser',format:'iife',globalName:'managerApi'});
await build({entryPoints:['tests/core.test.ts'],outfile:'.test-build/core.test.mjs',bundle:true,platform:'node',format:'esm',external:['jsdom','react','react-dom','react-dom/*','@base-ui/react/*','lucide-react','node:*'],loader:{'.css':'text'}});
const result=spawnSync(process.execPath,['--test','.test-build/core.test.mjs'],{stdio:'inherit'});process.exitCode=result.status??1;

import esbuild from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { argv } from 'node:process';

const args = Array.from(argv).slice(2);
const minify = args.includes('--minify');
const create_metafile = args.includes('--metafile');

const ctx = await esbuild.context({
    entryPoints: ['./src/index.ts', './examples/**/*', './docs/interactive-guides.*'],
    bundle: true,
    outdir: './build/esbuild',
    minify: minify,
    metafile: create_metafile,
    sourcemap: true,
    supported: {
        // Compile the CSS without nesting
        nesting: false,
    },
    loader: {
        '.html': 'copy',
    },
});

let doing_something = false;

if (args.includes('--watch')) {
    doing_something = true;
    process.stdout.write('Watching\n');
    ctx.watch();
}

if (args.includes('--serve')) {
    doing_something = true;
    const { hosts, port } = await ctx.serve();
    const list = hosts.map(host => `- http://${host}:${port}`);
    process.stdout.write('Listening on\n' + list.join('\n') + '\n');
}

if (!doing_something) {
    process.stdout.write('Running simple build\n');
    const result = await ctx.rebuild();

    if (result.metafile) {
        const dir = dirname(fileURLToPath(import.meta.url));
        const metafile_path = resolve(dir, 'build', 'meta.json');
        writeFileSync(metafile_path, JSON.stringify(result.metafile));
    }

    ctx.dispose();
}

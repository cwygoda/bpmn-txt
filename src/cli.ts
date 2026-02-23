#!/usr/bin/env node
import { cac } from 'cac';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, basename, dirname, extname } from 'path';
import { watch } from 'chokidar';
import pc from 'picocolors';
import { parse } from './parser/index.js';
import { validate } from './validator/index.js';
import { toJson, toBpmnXmlAsync } from './generators/index.js';
import type { ParseError } from './parser/index.js';
import type { ValidationError } from './validator/index.js';

const cli = cac('bpmn-txt');

interface CompileOptions {
  output?: string;
  format?: 'bpmn' | 'json';
  layout?: boolean;
  direction?: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';
  quiet?: boolean;
}

interface WatchOptions extends CompileOptions {
  // Watch inherits compile options
}

function formatError(file: string, error: ParseError | ValidationError): string {
  const loc = 'loc' in error && error.loc ? error.loc : null;
  const line = loc?.start?.line ?? '?';
  const col = loc?.start?.column ?? '?';
  return `${pc.cyan(file)}:${pc.yellow(String(line))}:${pc.yellow(String(col))} ${pc.red('error:')} ${error.message}`;
}

function getOutputPath(input: string, format: 'bpmn' | 'json', output?: string): string {
  if (output) return resolve(output);

  const dir = dirname(input);
  const base = basename(input, '.bpmn.md');
  const ext = format === 'bpmn' ? '.bpmn' : '.json';
  return resolve(dir, base + ext);
}

async function compile(inputPath: string, options: CompileOptions): Promise<boolean> {
  const { format = 'bpmn', layout = true, direction = 'RIGHT', quiet = false } = options;

  const absInput = resolve(inputPath);

  if (!existsSync(absInput)) {
    console.error(pc.red(`Error: File not found: ${inputPath}`));
    return false;
  }

  const content = readFileSync(absInput, 'utf-8');

  // Parse
  const { document, errors: parseErrors } = parse(content);

  if (parseErrors.length > 0) {
    for (const err of parseErrors) {
      console.error(formatError(inputPath, err));
    }
    return false;
  }

  if (!document) {
    console.error(pc.red('Error: Failed to parse document'));
    return false;
  }

  // Validate
  const { errors: validationErrors, warnings } = validate(document);

  if (validationErrors.length > 0) {
    for (const err of validationErrors) {
      console.error(formatError(inputPath, err));
    }
    return false;
  }

  // Show warnings
  if (!quiet && warnings.length > 0) {
    for (const warn of warnings) {
      const loc = warn.loc;
      const line = loc?.start?.line ?? '?';
      const col = loc?.start?.column ?? '?';
      console.warn(
        `${pc.cyan(inputPath)}:${pc.yellow(String(line))}:${pc.yellow(String(col))} ${pc.yellow('warning:')} ${warn.message}`
      );
    }
  }

  // Generate output
  let output: string;

  if (format === 'json') {
    output = toJson(document, { includeLocations: false });
  } else {
    if (layout) {
      output = await toBpmnXmlAsync(document, {
        layoutOptions: { direction },
      });
    } else {
      // Import sync version
      const { toBpmnXml } = await import('./generators/index.js');
      output = toBpmnXml(document);
    }
  }

  // Write output
  const outputPath = getOutputPath(absInput, format, options.output);
  writeFileSync(outputPath, output, 'utf-8');

  if (!quiet) {
    console.log(pc.green('✓') + ` ${pc.dim(inputPath)} → ${pc.cyan(basename(outputPath))}`);
  }

  return true;
}

// Compile command
cli
  .command('compile <input>', 'Compile a .bpmn.md file to BPMN XML or JSON')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Output format: bpmn (default) or json', { default: 'bpmn' })
  .option('--no-layout', 'Disable automatic layout generation')
  .option('-d, --direction <dir>', 'Layout direction: RIGHT, LEFT, DOWN, UP', { default: 'RIGHT' })
  .option('-q, --quiet', 'Suppress output except errors')
  .action(async (input: string, options: CompileOptions) => {
    const success = await compile(input, options);
    process.exit(success ? 0 : 1);
  });

// Watch command
cli
  .command('watch <input>', 'Watch a file and recompile on changes')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Output format: bpmn (default) or json', { default: 'bpmn' })
  .option('--no-layout', 'Disable automatic layout generation')
  .option('-d, --direction <dir>', 'Layout direction: RIGHT, LEFT, DOWN, UP', { default: 'RIGHT' })
  .action(async (input: string, options: WatchOptions) => {
    const absInput = resolve(input);

    if (!existsSync(absInput)) {
      console.error(pc.red(`Error: File not found: ${input}`));
      process.exit(1);
    }

    console.log(pc.cyan(`Watching ${input} for changes...`));
    console.log(pc.dim('Press Ctrl+C to stop\n'));

    // Initial compile
    await compile(input, { ...options, quiet: false });

    // Watch for changes
    const watcher = watch(absInput, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher.on('change', async () => {
      console.log(pc.dim(`\n[${new Date().toLocaleTimeString()}] File changed, recompiling...`));
      await compile(input, { ...options, quiet: false });
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(pc.dim('\nStopping watch...'));
      watcher.close();
      process.exit(0);
    });
  });

// Validate command (no output, just check)
cli
  .command('validate <input>', 'Validate a .bpmn.md file without generating output')
  .action(async (input: string) => {
    const absInput = resolve(input);

    if (!existsSync(absInput)) {
      console.error(pc.red(`Error: File not found: ${input}`));
      process.exit(1);
    }

    const content = readFileSync(absInput, 'utf-8');

    // Parse
    const { document, errors: parseErrors } = parse(content);

    if (parseErrors.length > 0) {
      for (const err of parseErrors) {
        console.error(formatError(input, err));
      }
      console.log(pc.red(`\n✗ ${parseErrors.length} parse error(s)`));
      process.exit(1);
    }

    if (!document) {
      console.error(pc.red('Error: Failed to parse document'));
      process.exit(1);
    }

    // Validate
    const { errors: validationErrors, warnings } = validate(document);

    // Show warnings
    for (const warn of warnings) {
      const loc = warn.loc;
      const line = loc?.start?.line ?? '?';
      const col = loc?.start?.column ?? '?';
      console.warn(
        `${pc.cyan(input)}:${pc.yellow(String(line))}:${pc.yellow(String(col))} ${pc.yellow('warning:')} ${warn.message}`
      );
    }

    if (validationErrors.length > 0) {
      for (const err of validationErrors) {
        console.error(formatError(input, err));
      }
      console.log(pc.red(`\n✗ ${validationErrors.length} validation error(s)`));
      process.exit(1);
    }

    console.log(pc.green('✓') + ` ${input} is valid`);
    if (warnings.length > 0) {
      console.log(pc.yellow(`  ${warnings.length} warning(s)`));
    }
    process.exit(0);
  });

// Version and help
cli.version('0.1.0');
cli.help();

// Parse and run
cli.parse();

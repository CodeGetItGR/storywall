// Temporary: compares captures of the same commit from several runs. Deleted after KAN-154.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runs = process.argv.slice(2).map((dir) => JSON.parse(readFileSync(join(dir, 'captures.json'), 'utf8')));
const [first, ...others] = runs;
const byId = others.map((records) => new Map(records.map((record) => [record.id, record])));

const failed = runs.flat().filter((record) => record.status === 'failed');
const mismatched = first.filter((record) => byId.some((other) => other.get(record.id)?.hash !== record.hash)).map((record) => record.id);

const print = (line) => process.stdout.write(`${line}\n`);

print(`Captures per run: ${runs.map((records) => records.length).join(', ')}`);
print(`Failed: ${failed.length}`);
for (const record of failed) print(`  ${record.id}: ${record.error}`);
print(`Differ between runs: ${mismatched.length}`);
for (const id of mismatched) print(`  ${id}`);

process.exit(failed.length > 0 || mismatched.length > 0 ? 1 : 0);

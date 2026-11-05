// Writes the invitation format as JSON Schema, for the backend to check what
// it stores against the same rules. Run after changing lib/invitation and
// copy the files into guestwall-be's src/main/resources/invitation/. With a
// second folder, it also writes the sample theme and invitation there, for
// guestwall-be's tests (src/test/resources/invitation/).
//
//   npx jiti scripts/save-my-date/export-json-schema.ts <output folder> [samples folder]
//
// JSON Schema cannot express the cross-field rules (unique ids, the footer
// last, text style paths); the backend checks those in code.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { invitationDocumentSchema } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import { themeDesignSchema } from '@/lib/invitation/theme';

const [outDir, samplesDir] = process.argv.slice(2);
if (!outDir) {
    console.error('Usage: export-json-schema.ts <output folder> [samples folder]');
    process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const schemas = { 'invitation-document': invitationDocumentSchema, 'theme-design': themeDesignSchema };
for (const [name, schema] of Object.entries(schemas)) {
    const json = z.toJSONSchema(schema, { target: 'draft-2020-12', reused: 'ref', unrepresentable: 'throw' });
    writeFileSync(join(outDir, `${name}.schema.json`), `${JSON.stringify(json, null, 2)}\n`);
}

if (samplesDir) {
    mkdirSync(samplesDir, { recursive: true });
    writeFileSync(join(samplesDir, 'sample-design.json'), `${JSON.stringify(SAMPLE_THEME, null, 2)}
`);
    writeFileSync(join(samplesDir, 'sample-document.json'), `${JSON.stringify(SAMPLE_DOCUMENT, null, 2)}
`);
}

// Deletes a closed PR's report and squashes the reports repo's history so it stops growing.
//
// Env: PR_NUMBER, REPORTS_REPO, VISUAL_REPORTS_DEPLOY_KEY

import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { updateReports } from './publish/reportsRepo.mjs';

const { PR_NUMBER, REPORTS_REPO, VISUAL_REPORTS_DEPLOY_KEY } = process.env;

await updateReports({ repo: REPORTS_REPO, deployKey: VISUAL_REPORTS_DEPLOY_KEY, message: `Remove report for PR ${PR_NUMBER}`, squash: true }, (site) => {
    rmSync(join(site, `pr-${PR_NUMBER}`), { recursive: true, force: true });
});

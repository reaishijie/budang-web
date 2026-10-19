const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const header = workflow.slice(0, workflow.indexOf('\njobs:'));

function jobBlock(jobName) {
  const marker = `  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `Missing ${jobName} job`);
  const rest = workflow.slice(start + marker.length);
  const nextJob = rest.search(/^  [a-z_]+:\s*$/m);
  return nextJob === -1 ? rest : rest.slice(0, nextJob);
}

const buildJob = jobBlock('build_image');
const publishJob = jobBlock('publish_image');
const deployJob = jobBlock('deploy');

assert.match(header, /pull_request:\s*\n\s+branches:\s*\n\s+- main/);
assert.match(header, /permissions:\s*\n\s+contents: read/);
assert.doesNotMatch(header, /packages:\s*write/);

assert.match(buildJob, /if: github\.event_name != 'push'/);
assert.match(buildJob, /push: false/);
assert.match(publishJob, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
assert.match(publishJob, /packages: write/);
assert.match(publishJob, /github\.run_id/);
assert.match(publishJob, /github\.run_attempt/);
assert.doesNotMatch(workflow, /value=latest/);

assert.match(deployJob, /needs: publish_image/);
assert.match(deployJob, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
assert.match(deployJob, /packages: read/);
assert.match(deployJob, /run: bash deploy\/ci-deploy\.sh/);

console.log('Workflow contract tests passed.');

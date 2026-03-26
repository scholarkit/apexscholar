import { Router } from 'express';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export const latexRouter = Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'scholarkit';
const GITHUB_REPO = 'LaTex';

latexRouter.post('/compile', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing content' });

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({
      error: 'GitHub configuration missing',
      details: 'Ensure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are set in .env',
    });
  }

  try {
    console.log(`Dispatching GitHub Workflow for LaTeX compilation...`);

    // 1. Dispatch Workflow
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/compile.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { tex: content },
        }),
      }
    );

    if (!dispatchRes.ok) {
      const error = await dispatchRes.text();
      throw new Error(`GitHub Dispatch Failed: ${error}`);
    }

    // 2. Poll for the specific run
    await new Promise((r) => setTimeout(r, 4000));

    let runId = null;
    let status = 'queued';
    let attempts = 0;
    const MAX_ATTEMPTS = 40;

    while (attempts < MAX_ATTEMPTS) {
      const runsRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?workflow=compile.yml&event=workflow_dispatch&per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );
      const runsData = await runsRes.json();
      const latestRun = runsData.workflow_runs?.[0];

      if (latestRun) {
        runId = latestRun.id;
        status = latestRun.status;

        if (status === 'completed') {
          if (latestRun.conclusion !== 'success') {
            throw new Error(`Workflow failed with conclusion: ${latestRun.conclusion}`);
          }
          break;
        }
      }

      console.log(
        `Polling workflow run... Status: ${status} (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`
      );
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;
    }

    if (status !== 'completed') {
      throw new Error('Workflow timed out or failed to complete.');
    }
    await new Promise((r) => setTimeout(r, 3000));
    // 3. Get Artifacts
    console.log(`Retrieving artifact for Run ID: ${runId}`);
    const artifactsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      }
    );
    const artifactsText = await artifactsRes.text();
    const artifactsData = JSON.parse(artifactsText);
    const artifact = artifactsData.artifacts?.find((a: any) => a.name === 'pdf');

    if (!artifact) {
      throw new Error('Compiled PDF artifact not found.');
    }

    // 4. Download and Extract PDF
    const downloadRes = await fetch(artifact.archive_download_url, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    const buffer = await downloadRes.arrayBuffer();

    const zip = new AdmZip(Buffer.from(buffer));
    const zipEntries = zip.getEntries();
    const pdfEntry = zipEntries.find((e) => e.entryName.endsWith('.pdf'));

    if (!pdfEntry) {
      throw new Error('manuscript.pdf not found in artifact ZIP.');
    }

    res.set('Content-Type', 'application/pdf');
    res.send(pdfEntry.getData());
  } catch (err) {
    console.error('LaTeX compilation error:', err);
    res.status(500).json({ error: 'LaTeX compilation failed', details: (err as any).message });
  }
});

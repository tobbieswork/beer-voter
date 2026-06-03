/* global process */
import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI();
const issueTitle = process.env.ISSUE_TITLE || '';
const issueBody = process.env.ISSUE_BODY || '';
const issueNumber = process.env.ISSUE_NUMBER || '';

async function runAgent() {
  console.log(`🚀 Starting Gemini Coding Agent for Issue #${issueNumber}...`);

  // 1. Gather repository files context (excluding node_modules, git, etc.)
  const filesList = getRepoFiles();

  // 2. Draft the prompt for Gemini
  const prompt = `
    You are an autonomous AI coding assistant. Your task is to solve this issue:
    
    Issue Title: ${issueTitle}
    Issue Description:
    ${issueBody}
    
    Here is a list of relevant files in the repository:
    ${filesList.join('\n')}
    
    Instructions:
    1. Read the files related to the issue.
    2. Suggest the exact changes (diff format or replacement).
    3. Modify the files directly.
    
    Which files do you need to inspect? Respond with a JSON array of relative file paths.
  `;

  // 3. Ask Gemini to identify files to read
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro', // Use Pro for complex coding tasks
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const filesToInspect = JSON.parse(response.text);
  console.log(`🔍 Gemini wants to inspect:`, filesToInspect);

  // 4. Provide file contents to Gemini and request the edits
  let fileContexts = '';
  for (const filePath of filesToInspect) {
    if (fs.existsSync(filePath)) {
      fileContexts += `\n--- File: ${filePath} ---\n${fs.readFileSync(filePath, 'utf8')}\n`;
    }
  }

  const editPrompt = `
    Here are the contents of the files you requested:
    ${fileContexts}
    
    Based on this, modify the codebase to fix the issue. Respond with the full updated content of each file you want to change.
    Format your response in JSON:
    [
      { "path": "relative/path/to/file", "content": "NEW FULL FILE CONTENT HERE" }
    ]
  `;

  const editResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: editPrompt,
    config: { responseMimeType: 'application/json' },
  });

  const fileEdits = JSON.parse(editResponse.text);

  // 5. Apply changes locally
  for (const edit of fileEdits) {
    console.log(`📝 Modifying file: ${edit.path}`);
    const dir = path.dirname(edit.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(edit.path, edit.content, 'utf8');
  }

  // 6. Test the changes
  try {
    console.log('🧪 Testing changes (lint & build)...');
    execSync('npm run lint', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Build or lint checks failed. Reverting changes:', err);
    process.exit(1);
  }

  // 7. Push changes & Open PR
  const branchName = `gemini-fix-issue-${issueNumber}`;
  console.log(`📤 Pushing changes to branch ${branchName}...`);

  execSync(`git config user.name "Gemini Coding Bot"`);
  execSync(`git config user.email "gemini-bot@google.com"`);
  execSync(`git checkout -b ${branchName}`);
  execSync(`git add .`);
  execSync(`git commit -m "fix: resolve issue #${issueNumber}"`);
  execSync(`git push -u origin ${branchName} --force`);

  console.log(`🔀 Creating Pull Request...`);
  execSync(
    `gh pr create --title "fix: solve issue #${issueNumber}" --body "Automated fix by Gemini for issue #${issueNumber}." --base main --head ${branchName}`,
    {
      env: { ...process.env, GITHUB_TOKEN: process.env.GITHUB_TOKEN },
    }
  );

  console.log(`✅ Success! Pull Request created.`);
}

function getRepoFiles(dir = '.', files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    if (
      file === 'node_modules' ||
      file === '.git' ||
      file === 'dist' ||
      file === '.github' ||
      file === '.gemini' ||
      file === '.antigravitycli'
    )
      continue;
    if (fs.statSync(filePath).isDirectory()) {
      getRepoFiles(filePath, files);
    } else {
      files.push(filePath);
    }
  }
  return files;
}

runAgent().catch(console.error);

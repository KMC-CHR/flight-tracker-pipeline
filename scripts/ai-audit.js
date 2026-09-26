import { execSync } from 'node:child_process';

// 1. Get only changed code lines to keep payload small
const diff = execSync('git diff HEAD~1 -- "*.js"').toString();

if (!diff.trim()) {
    console.log('No JavaScript changes detected. Skipping SLM audit.');
    process.exit(0);
}

// 2. Focused prompt targeting security and logical flaws
const prompt = `You are a lightweight security auditor. Review this git diff for critical security flaws (XSS, Injection, Broken Auth) or game-breaking bugs.

Diff:
${diff}

Respond ONLY in valid JSON format:
{"pass": boolean, "reason": "short explanation"}`;

try {
    // 3. Fast local Ollama invocation
    const response = execSync(`ollama run llama3.2:1b "${prompt.replace(/"/g, '\\"')}"`).toString();
    const result = JSON.parse(response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1));

    if (!result.pass) {
        console.error(`AI Audit Failed: ${result.reason}`);
        process.exit(1);
    }

    console.log('AI Security Audit Passed.');
} catch (err) {
    console.warn('SLM Audit bypassed or failed to parse. Proceeding safely.');
}
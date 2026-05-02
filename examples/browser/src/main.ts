import { parse, build } from 'plist';
import './style.css';

// Wire up parse demo
const parseInput = document.getElementById('parse-input') as HTMLTextAreaElement;
const parseOutput = document.getElementById('parse-output') as HTMLPreElement;
const parseBtn = document.getElementById('parse-btn') as HTMLButtonElement;

parseBtn.addEventListener('click', () => {
  try {
    const result = parse(parseInput.value);
    parseOutput.textContent = JSON.stringify(result, null, 2);
    parseOutput.classList.remove('error');
  } catch (e) {
    parseOutput.textContent = `Error: ${(e as Error).message}`;
    parseOutput.classList.add('error');
  }
});

// Wire up build demo
const buildInput = document.getElementById('build-input') as HTMLTextAreaElement;
const buildOutput = document.getElementById('build-output') as HTMLPreElement;
const buildBtn = document.getElementById('build-btn') as HTMLButtonElement;

buildBtn.addEventListener('click', () => {
  try {
    const obj = JSON.parse(buildInput.value);
    const result = build(obj);
    buildOutput.textContent = result;
    buildOutput.classList.remove('error');
  } catch (e) {
    buildOutput.textContent = `Error: ${(e as Error).message}`;
    buildOutput.classList.add('error');
  }
});

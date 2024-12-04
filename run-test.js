import { execSync } from 'child_process';

console.log("Running distributed system test...");

try {
  execSync('npm test', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error: ${error.message}`);
}


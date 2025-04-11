/**
 * This script updates the wrangler.toml and wrangler-dev.toml files with the repository name
 * It's meant to be run before deploying the worker
 */

const fs = require('fs');
const path = require('path');

// Get the repository name from the current directory
function getRepoName() {
  try {
    const cwd = process.cwd();
    let repoName = path.basename(cwd) || 'uptimeflare';

    // Convert to lowercase for Cloudflare compatibility
    repoName = repoName.toLowerCase();

    return repoName;
  } catch (error) {
    console.error('Error getting repository name:', error);
    return 'uptimeflare';
  }
}

// Update the wrangler.toml file
function updateWranglerConfig(configPath, repoName) {
  try {
    if (!fs.existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      return;
    }

    let content = fs.readFileSync(configPath, 'utf8');

    // For worker names, we need to use dashes instead of underscores
    // and ensure it's lowercase alphanumeric with dashes only
    const workerName = `${repoName}-worker`;

    // Replace the name line with the repository name
    content = content.replace(
      /name\s*=\s*"[^"]*"/,
      `name = "${workerName}"`
    );

    fs.writeFileSync(configPath, content, 'utf8');
    console.log(`Updated ${configPath} with name = "${workerName}"`);
  } catch (error) {
    console.error(`Error updating ${configPath}:`, error);
  }
}

// Main function
function main() {
  const repoName = getRepoName();
  console.log(`Using repository name: ${repoName}`);

  const wranglerPath = path.join(process.cwd(), 'worker', 'wrangler.toml');
  const wranglerDevPath = path.join(process.cwd(), 'worker', 'wrangler-dev.toml');

  updateWranglerConfig(wranglerPath, repoName);
  updateWranglerConfig(wranglerDevPath, repoName);
}

// Run the script
main();

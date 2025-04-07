/**
 * This script updates the package.json name field with the repository name
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

// Update the package.json file
function updatePackageJson(packagePath, repoName, isWorker = false) {
  try {
    if (!fs.existsSync(packagePath)) {
      console.error(`Package file not found: ${packagePath}`);
      return;
    }

    const packageJson = require(packagePath);

    // Update the name field
    // For worker package, use dashes instead of underscores
    if (isWorker) {
      packageJson.name = `${repoName}-worker`;
    } else {
      packageJson.name = repoName;
    }

    // Write the updated package.json
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log(`Updated ${packagePath} with name = "${packageJson.name}"`);
  } catch (error) {
    console.error(`Error updating ${packagePath}:`, error);
  }
}

// Main function
function main() {
  const repoName = getRepoName();
  console.log(`Using repository name: ${repoName}`);

  const packagePath = path.join(process.cwd(), 'package.json');
  const workerPackagePath = path.join(process.cwd(), 'worker', 'package.json');

  updatePackageJson(packagePath, repoName);

  // Also update the worker package.json if it exists
  if (fs.existsSync(workerPackagePath)) {
    updatePackageJson(workerPackagePath, repoName, true);
  }
}

// Run the script
main();

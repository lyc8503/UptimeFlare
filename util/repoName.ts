/**
 * Utility function to get the repository name from the current directory path
 * This is used to dynamically name Cloudflare resources based on the repository name
 */
export function getRepoName(): string {
  try {
    // Get the current directory path
    const path = process.cwd();

    // Extract the repository name from the path
    // The repository name is the last directory in the path
    let repoName = path.split(/[\/\\]/).pop() || 'uptimeflare';

    // Convert to lowercase and ensure it's compatible with Cloudflare naming requirements
    // For KV namespaces, we use underscores
    repoName = repoName.toLowerCase();

    return repoName;
  } catch (error) {
    // Fallback to default name if there's an error
    console.error('Error getting repository name:', error);
    return 'uptimeflare';
  }
}

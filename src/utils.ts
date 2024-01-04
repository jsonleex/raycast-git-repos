import { exec } from "node:child_process";
import { join } from "node:path";

interface Repo {
  url: string;
  repo: string;
  user: string;
  provider: string;
}

export function getRepo(url: string): Repo | undefined {
  if (!url) return;

  if (url.includes("github.com")) {
    // git@github.com:owner/repo.git
    // https://github.com/owner/repo.git
    const [user, repo] = url
      .split("github.com")[1]
      .replace(/^[/:]/, "")
      .replace(/\.git$/, "")
      .split("/");

    if (!repo || !user) return;

    return { url, repo, user, provider: "github" };
  }
}

export function getDirectory(url: string, root: string) {
  const repo = getRepo(url);

  if (!repo) return;

  switch (repo.provider) {
    case "github":
      return join(root || "", repo.provider, repo.user, repo.repo);
  }
}

export async function runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    console.log(">", command, "<");
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

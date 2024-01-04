import { Action, ActionPanel, Icon, List, confirmAlert, getPreferenceValues, trash } from "@raycast/api";
import { glob } from "fast-glob";
import { useCachedPromise } from "@raycast/utils";
import { dirname } from "node:path";
import { homedir } from "node:os";

export default function Command() {
  const preference = getPreferenceValues<Preferences.Index>();

  const editor = preference.editor!;
  const directories = [preference.root];
  const ignores = preference.ignores?.split(",").map((d) => d.trim());

  if (preference.includes) {
    directories.push(...preference.includes.split(",").map((d) => d.trim()));
  }

  const state = useCachedPromise(() => scanDirectories(directories, ignores), [], { execute: true });

  async function handleDeleteRepo(repo: string) {
    if (
      await confirmAlert({
        icon: Icon.Warning,
        title: "Confirm",
        message: `Delete "${repo}"?`,
      })
    ) {
      await trash(repo);
      state.revalidate();
    }
  }

  return (
    <List isLoading={state.isLoading}>
      {state.data?.map((repo) => (
        <List.Item
          title={repo.split("/").pop()!}
          accessories={[{ text: dirname(repo) }]}
          key={repo}
          actions={
            <ActionPanel>
              <Action.Open target={repo} application={editor} title={`Open in ${editor.name}`} />
              <Action.Open target={repo} application="Finder" title="Open in Finder" />
              <Action
                title="Delete"
                icon={Icon.Trash}
                onAction={() => handleDeleteRepo(repo)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function findRepos(root: string, ignores: string[]) {
  const cwd = root.replace(/^~/, homedir());

  const files = await glob("./**/.git", {
    cwd,
    absolute: true,
    deep: 5,
    onlyDirectories: true,
    ignore: [...ignores],
  });

  return files.map((file) => dirname(file).replace(homedir(), "~"));
}

async function scanDirectories(roots: string[], ignores: string[] = []) {
  const repos = await Promise.all(roots.map(async (path) => await findRepos(path, ignores)));

  return repos.flat();
}

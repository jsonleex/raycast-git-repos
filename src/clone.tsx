import {
  Action,
  ActionPanel,
  Form,
  Clipboard,
  getPreferenceValues,
  showToast,
  Toast,
  Detail,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { exec } from "node:child_process";

interface FormValues {
  repository: string;
  directory: string;
}

export default function Command() {
  const { push } = useNavigation();
  const preference = getPreferenceValues<Preferences.Clone>();

  const [repository, setRepository] = useState("");
  const [repositoryError, setRepositoryError] = useState<string | undefined>();

  const [directory, setDirectory] = useState("");
  const [directoryError, setDirectoryError] = useState<string | undefined>();
  const [executing, setExecuting] = useState(false);

  function validateRepository(repository: string) {
    if (!repository) {
      setRepositoryError("Repository is required");
      return false;
    }

    setDirectoryError(undefined);
    return true;
  }

  function validateDirectory(directory: string) {
    if (!directory) {
      setDirectoryError("Directory is required");
      return false;
    }

    if (existsSync(directory)) {
      setDirectoryError(
        [
          `Repository already cloned into`,
          `-`.repeat(46),
          `${directory}`,
          `-`.repeat(46),
          `You can clone to another directory by customizing it`,
        ].join("\n"),
      );

      return false;
    }

    setRepositoryError(undefined);
    return true;
  }

  useEffect(() => {
    if (!repository) {
      return;
    }

    setDirectoryError(undefined);
    setRepositoryError(undefined);

    if (repository.includes("github.com")) {
      // git@github.com:jsonleex/leex.raycast.git
      // https://github.com/jsonleex/leex.raycast.git
      const [username, name] = repository
        .replace(".git", "")
        .replace("git@github.com:", "")
        .replace("https://github.com/", "")
        .split("/"); // [jsonleex, leex.raycast]

      const directory = join(preference.root, "github", username, name);
      setDirectory(directory);
      validateDirectory(directory);
      return;
    }

    setRepositoryError("Invalid repository url");
  }, [repository]);

  async function executeCommand({ repository, directory }: FormValues) {
    if (executing || !validateRepository(repository) || !validateDirectory(directory)) {
      return;
    }
    setExecuting(true);
    const command = `git clone ${repository} ${directory}`;
    showToast({ style: Toast.Style.Animated, title: "Cloning...", message: "Please wait..." });
    try {
      await promisify(exec)(command);
      showToast({ style: Toast.Style.Success, title: "Success", message: "Repo cloned!" });
      push(<Result directory={directory} repository={repository} />);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Something went wrong: ${error}`;
      showToast({ style: Toast.Style.Failure, title: "Failed", message });
    }
    setExecuting(false);
  }

  async function copyCommand({ repository, directory }: FormValues) {
    const command = `git clone ${repository} ${directory}`;
    Clipboard.copy(command);
    showToast({ style: Toast.Style.Success, title: "Success", message: "Copied to clipboard!" });
  }

  return (
    <Form
      navigationTitle="Clone Repo"
      isLoading={executing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Command" onSubmit={executeCommand} />
          <Action.SubmitForm title="Copy Command" onSubmit={copyCommand} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="repository"
        title="Repository"
        placeholder="Repository https or ssh url"
        autoFocus={true}
        value={repository}
        error={repositoryError}
        onBlur={() => validateRepository(repository)}
        onChange={(value) => setRepository(value)}
      />

      <Form.TextField
        id="directory"
        title="Directory"
        placeholder="Directory to clone into"
        value={directory}
        error={directoryError}
        onBlur={() => validateDirectory(directory)}
        onChange={(value) => setDirectory(value)}
      />
    </Form>
  );
}

function Result({ directory, repository }: { directory: string; repository: string }) {
  const preference = getPreferenceValues<Preferences.Clone>();
  let markdown = [`# Repository cloned`, "", `- origin: \`${repository}\``, "", `- directory: \`${directory}\``].join(
    `\n`,
  );

  const readme = join(directory, "README.md");
  if (existsSync(readme)) {
    markdown = readFileSync(readme, "utf-8");
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open
            title="Open in Editor"
            target={directory}
            application={preference.editor}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.Open
            title="Open in Finder"
            target={directory}
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

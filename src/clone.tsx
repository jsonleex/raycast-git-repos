import { Action, ActionPanel, Form, Clipboard, getPreferenceValues, showToast } from "@raycast/api";
import { useState } from "react";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export default function Command() {
  const preference = getPreferenceValues<Preferences.Clone>();
  const root = preference.root.replace(homedir(), "~");

  const [executing, setExecuting] = useState(false);

  const [directory, setDirectory] = useState<string | undefined>();
  const [directoryErr, setDirectoryErr] = useState<string | undefined>();

  const [repository, setRepository] = useState<string | undefined>();
  const [repositoryErr, setRepositoryErr] = useState<string | undefined>();

  function getDirectory(url?: string) {
    if (!url) {
      return;
    }

    if (url.includes("github.com")) {
      // git@github.com:jsonleex/leex.raycast.git
      // https://github.com/jsonleex/leex.raycast.git
      const [username, name] = url
        .replace(".git", "")
        .replace("git@github.com:", "")
        .replace("https://github.com/", "")
        .split("/"); // [jsonleex, leex.raycast]

      return join(root, "github", username, name);
    }

    setRepositoryErr("Unsupported repository!");
  }

  function handleRepositoryChange(url?: string) {
    setRepositoryErr("");
    setRepository(url);
    setDirectory(getDirectory(url));
    validateFormValues();
  }

  function validateFormValues() {
    if (!repository) {
      setRepositoryErr("Repository is required");
      return false;
    }

    if (!directory) {
      setDirectoryErr("Cannot infer directory automatically, Please input one");
      return false;
    } else if (existsSync(directory.replace(`~`, homedir()))) {
      setDirectoryErr("Directory already exists! Please input another one");
      return false;
    }

    return true;
  }

  function handleActionClick(execute?: boolean) {
    if (executing) {
      return;
    }
    setExecuting(true);

    if (!validateFormValues()) {
      setExecuting(false);
      return;
    }

    try {
      const command = `git clone ${repository} ${directory}`;

      if (execute) {
        execSync(command);
        showToast({
          title: "Success",
          message: "Repository cloned!",
        });
      } else {
        Clipboard.copy(command);
        showToast({
          title: "Success",
          message: "Copied to clipboard!",
        });
      }
    } finally {
      setExecuting(false);
    }
  }

  return (
    <Form
      isLoading={executing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Command" onSubmit={() => handleActionClick(true)} />
          <Action.SubmitForm title="Copy Command" onSubmit={() => handleActionClick()} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="repository"
        title="Repository"
        placeholder="Repository https or ssh url"
        value={repository}
        error={repositoryErr}
        onBlur={({ target }) => handleRepositoryChange(target.value)}
      />
      <Form.TextField
        id="directory"
        title="Directory"
        placeholder="Directory to clone to"
        value={directory}
        error={directoryErr}
        onBlur={({ target }) => setDirectory(target.value)}
      />
    </Form>
  );
}

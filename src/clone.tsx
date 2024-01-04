import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import {} from "@raycast/utils";
import { getDirectory, runCommand } from "./utils";
import { useState } from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface FormValues {
  repository: string;
  directory: string;
}

export default function Command() {
  const preference = getPreferenceValues<Preferences.Clone>();

  const [directory, setDirectory] = useState<string>("");
  const [repository, setRepository] = useState<string>("");

  const [directoryError, setDirectoryError] = useState("");
  const [repositoryError, setRepositoryError] = useState("");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const { push } = useNavigation();

  function validateFormValues(values: FormValues): Promise<boolean> {
    return new Promise((resolve) => {
      setDirectoryError("");
      setRepositoryError("");

      if (!values.repository) {
        setRepositoryError("Repository is required");
        return resolve(false);
      }

      if (!values.directory) {
        setDirectoryError("Directory is required");
        return resolve(false);
      } else if (existsSync(values.directory)) {
        setDirectoryError("Directory already exists");
        return resolve(false);
      }

      return resolve(true);
    });
  }

  function buildCommand(form: FormValues) {
    return `git clone ${form.repository} ${form.directory}`;
  }

  async function handleExecuteClick(form: FormValues) {
    if (running) {
      return;
    }

    setError("");
    setRunning(true);

    if (await validateFormValues(form)) {
      const command = buildCommand(form);

      if (command) {
        try {
          await runCommand(command);
          push(<Result directory={form.directory} repository={form.repository} />);
        } catch (error) {
          setError(String(error));
          let message = "Clone Failed!";
          if (error instanceof Error) {
            const lines = error.message.split("\n");
            message = lines.find((line) => line.startsWith("fatal:")) ?? lines[0] ?? message;
          }
          showToast({ title: "Error", message, style: Toast.Style.Failure });
        }
      }
    }

    setRunning(false);
  }

  async function handleCopyClick(form: FormValues) {
    if (await validateFormValues(form)) {
      const command = buildCommand(form);
      if (command) {
        await Clipboard.copy(command);
      }
    }
  }

  return (
    <Form
      isLoading={running}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Command" icon={Icon.Terminal} onSubmit={handleExecuteClick} />
          <Action.SubmitForm title="Copy to Clipboard" icon={Icon.Clipboard} onSubmit={handleCopyClick} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="repository"
        title="Repository"
        placeholder="Repository https or ssh url"
        value={repository}
        error={repositoryError}
        onChange={(repository) => {
          const directory = getDirectory(repository, preference.root) ?? "";
          setDirectory(directory);
          setRepository(repository);

          if (directory) {
            validateFormValues({ repository, directory });
          }
        }}
      />

      <Form.TextField
        id="directory"
        title="Directory"
        placeholder="Directory to clone into"
        value={directory}
        error={directoryError}
        onChange={(directory) => {
          setDirectory(directory);
          directory && validateFormValues({ repository, directory });
        }}
      />

      <Form.Description text={error} />
    </Form>
  );
}

function Result(props: { directory: string; repository: string }) {
  const editor = getPreferenceValues<Preferences.Clone>().editor;

  let markdown = [
    "# Repo Cloned 🎉",
    `- **Repository ➤** \`${props.repository}\``,
    `- **Directory    ➤** \`${props.directory}\``,
  ].join("\n");

  const readme = join(props.directory, "README.md");
  if (existsSync(readme)) {
    markdown = readFileSync(readme, "utf-8");
  }

  return (
    <Detail
      navigationTitle="Command Result"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open
            title="Open in Editor"
            target={props.directory}
            application={editor}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.ShowInFinder
            title="Open in Finder"
            path={props.directory}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.OpenWith title="Open With" path={props.directory} />
        </ActionPanel>
      }
    />
  );
}

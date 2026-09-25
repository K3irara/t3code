const REPLAY_WORKSPACE_PLACEHOLDER = "<workspace>";
const REPLAY_HOME = "/home/replay-user";
const REPLAY_HOSTNAME = "replay-host";

function withWorkspacePlaceholder(value: unknown, workspace: string): unknown {
  if (value === workspace) {
    return REPLAY_WORKSPACE_PLACEHOLDER;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => withWorkspacePlaceholder(entry, workspace));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, withWorkspacePlaceholder(entry, workspace)]),
  );
}

function withoutMachineIdentity(
  value: unknown,
  machine: { readonly home: string; readonly hostname: string },
): unknown {
  if (typeof value === "string") {
    return value === machine.hostname
      ? REPLAY_HOSTNAME
      : value.replaceAll(machine.home, REPLAY_HOME);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => withoutMachineIdentity(entry, machine));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, withoutMachineIdentity(entry, machine)]),
  );
}

/**
 * Codex supports multiple provider threads in one app-server session, so native
 * fork recording keeps the request ids emitted by that single client. Outbound
 * frames name the recording cwd `<workspace>`, which replay swaps for its own
 * checkpoint workspace. With `machine`, every frame also swaps the recording
 * home directory and hostname for neutral values so fixtures carry no local
 * identity; the adapter reads neither.
 */
export function codexReplayRecordingOutputRecords(
  records: ReadonlyArray<Record<string, unknown>>,
  options: {
    readonly workspace: string;
    readonly machine?: { readonly home: string; readonly hostname: string };
  },
): ReadonlyArray<Record<string, unknown>> {
  return records.map((record) => {
    const named =
      record.type === "expect_outbound"
        ? { ...record, frame: withWorkspacePlaceholder(record.frame, options.workspace) }
        : record;
    return options.machine === undefined || !("frame" in named)
      ? named
      : { ...named, frame: withoutMachineIdentity(named.frame, options.machine) };
  });
}

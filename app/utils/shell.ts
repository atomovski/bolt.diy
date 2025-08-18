import type { Sandbox } from 'e2b';
import type { ITerminal } from '~/types/terminal';
import { atom } from 'nanostores';
import { logger } from './logger';

export async function newShellProcess(sandbox: Sandbox, terminal: ITerminal) {
  // E2B uses PTY for terminal display only
  const ptyProcess = await sandbox.pty.create({
    cols: terminal.cols ?? 80,
    rows: terminal.rows ?? 15,
    onData: (data) => {
      try {
        terminal.write(new TextDecoder().decode(data));
      } catch (error) {
        console.warn('Failed to decode PTY data:', error);
      }
    },
  });

  // Handle terminal input
  terminal.onData((data) => {
    try {
      sandbox.pty.sendInput(ptyProcess.pid, new TextEncoder().encode(data));
    } catch (error) {
      console.warn('Failed to send input to PTY:', error);
    }
  });

  return ptyProcess;
}

export type ExecutionResult = { output: string; exitCode: number } | undefined;

export class BoltShell {
  #initialized: (() => void) | undefined;
  #readyPromise: Promise<void>;
  #sandbox: Sandbox | undefined;
  #terminal: ITerminal | undefined;
  #ptyProcess: any | undefined;
  executionState = atom<
    { sessionId: string; active: boolean; executionPrms?: Promise<any>; abort?: () => void } | undefined
  >();

  constructor() {
    this.#readyPromise = new Promise((resolve) => {
      this.#initialized = resolve;
    });
  }

  ready() {
    return this.#readyPromise;
  }

  async init(sandbox: Sandbox, terminal: ITerminal) {
    this.#sandbox = sandbox;
    this.#terminal = terminal;

    // Create PTY for terminal display
    this.#ptyProcess = await this.newBoltShellProcess(sandbox, terminal);

    // E2B PTY is ready immediately
    this.#initialized?.();
  }

  async newBoltShellProcess(sandbox: Sandbox, terminal: ITerminal) {
    // Create PTY process in E2B
    const ptyProcess = await sandbox.pty.create({
      cols: terminal.cols ?? 80,
      rows: terminal.rows ?? 15,
      onData: (data) => {
        try {
          terminal.write(new TextDecoder().decode(data));
        } catch (error) {
          console.warn('Failed to decode PTY data:', error);
        }
      },
    });

    // E2B PTY handles input differently
    terminal.onData((data) => {
      try {
        sandbox.pty.sendInput(ptyProcess.pid, new TextEncoder().encode(data));
      } catch (error) {
        console.warn('Failed to send input to PTY:', error);
      }
    });

    return ptyProcess;
  }

  get terminal() {
    return this.#terminal;
  }

  get process() {
    return this.#ptyProcess;
  }

  async executeCommand(sessionId: string, command: string, _abort?: () => void): Promise<ExecutionResult> {
    if (!this.#sandbox) {
      return undefined;
    }

    const state = this.executionState.get();

    if (state?.active && state.abort) {
      state.abort();
    }

    try {
      // Use E2B commands API for actual command execution
      const terminal = this.#terminal;
      const result = await this.#sandbox.commands.run(command.trim(), {
        background: false,
        timeoutMs: 0,
        cwd: '/home/project',
        onStdout(data) {
          logger.debug('Command stdout:', data);
          terminal?.write(data);
        },
        onStderr(data) {
          logger.debug('Command stderr:', data);
          terminal?.write(data);
        },
      });

      // Also show the command in the terminal for user feedback
      if (this.#terminal) {
        this.#terminal.write(`\r\n$ ${command.trim()}\r\n`);

        if (result.stdout) {
          this.#terminal.write(result.stdout);
        }

        if (result.stderr) {
          this.#terminal.write(result.stderr);
        }
      }

      return {
        output: result.stdout + result.stderr,
        exitCode: result.exitCode,
      };
    } catch (error) {
      console.error('Command execution failed:', error);
      return {
        output: error instanceof Error ? error.message : 'Command execution failed',
        exitCode: 1,
      };
    }
  }
}

/**
 * Cleans and formats terminal output while preserving structure and paths
 * Handles ANSI, OSC, and various terminal control sequences
 */
export function cleanTerminalOutput(input: string): string {
  // Step 1: Remove OSC sequences (including those with parameters)
  const removeOsc = input
    .replace(/\x1b\](\d+;[^\x07\x1b]*|\d+[^\x07\x1b]*)\x07/g, '')
    .replace(/\](\d+;[^\n]*|\d+[^\n]*)/g, '');

  // Step 2: Remove ANSI escape sequences and color codes more thoroughly
  const removeAnsi = removeOsc
    // Remove all escape sequences with parameters
    .replace(/\u001b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    // Remove color codes
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    // Clean up any remaining escape characters
    .replace(/\u001b/g, '')
    .replace(/\x1b/g, '');

  // Step 3: Clean up carriage returns and newlines
  const cleanNewlines = removeAnsi
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // Step 4: Add newlines at key breakpoints while preserving paths
  const formatOutput = cleanNewlines
    // Preserve prompt line
    .replace(/^([~\/][^\n❯]+)❯/m, '$1\n❯')
    // Add newline before command output indicators
    .replace(/(?<!^|\n)>/g, '\n>')
    // Add newline before error keywords without breaking paths
    .replace(/(?<!^|\n|\w)(error|failed|warning|Error|Failed|Warning):/g, '\n$1:')
    // Add newline before 'at' in stack traces without breaking paths
    .replace(/(?<!^|\n|\/)(at\s+(?!async|sync))/g, '\nat ')
    // Ensure 'at async' stays on same line
    .replace(/\bat\s+async/g, 'at async')
    // Add newline before npm error indicators
    .replace(/(?<!^|\n)(npm ERR!)/g, '\n$1');

  // Step 5: Clean up whitespace while preserving intentional spacing
  const cleanSpaces = formatOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  // Step 6: Final cleanup
  return cleanSpaces
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/:\s+/g, ': ') // Normalize spacing after colons
    .replace(/\s{2,}/g, ' ') // Remove multiple spaces
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/\u0000/g, ''); // Remove null characters
}

export function newBoltShellProcess() {
  return new BoltShell();
}

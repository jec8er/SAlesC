import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createLocalInference } from "../server/local-inference.ts";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "orbit-local-model-"));
  const paths = {
    binary: join(root, "runtime"),
    primaryModel: join(root, "primary.gguf"),
    reviewModel: join(root, "review.gguf"),
    stateDirectory: join(root, "scratch"),
  };
  await Promise.all(
    [paths.binary, paths.primaryModel, paths.reviewModel].map((file) =>
      writeFile(file, "fixture"),
    ),
  );
  return {
    ...paths,
    cleanup: async () => {
      assert.ok(
        resolve(root).startsWith(resolve(tmpdir()) + "\\orbit-local-model-") ||
          resolve(root).startsWith(resolve(tmpdir()) + "/orbit-local-model-"),
      );
      await rm(root, { recursive: true, force: true });
    },
  };
}

test("local team routes review to a separate model and cleans private prompt files", async () => {
  const files = await fixture();
  try {
    const used: string[] = [];
    const infer = await createLocalInference(files, {
      availableMemory: () => 8 * 1073741824,
      execute: async (_binary, args, options) => {
        used.push(args[args.indexOf("-m") + 1]);
        const prompt = await readFile(args[args.indexOf("-f") + 1], "utf8");
        assert.ok(prompt.includes("fixture task"));
        assert.equal(options.shell, false);
        assert.equal(options.windowsHide, true);
        assert.equal(args[args.indexOf("-t") + 1], "2");
        return {
          stdout: args.includes("--json-schema")
            ? '{"accepted":false,"defects":["Missing evidence"]} [end of text]\n'
            : "Draft result [end of text]\n",
          stderr: "private runtime diagnostics",
        };
      },
    });
    assert.equal(
      await infer({
        role: "Hugo",
        instructions: "Fixture",
        input: "fixture task",
      }),
      "Draft result",
    );
    assert.equal(
      JSON.parse(
        await infer({
          role: "Marcela",
          instructions: "Fixture",
          input: "fixture task",
        }),
      ).accepted,
      false,
    );
    assert.deepEqual(used, [files.primaryModel, files.reviewModel]);
    assert.deepEqual(await readdir(files.stateDirectory), []);
  } finally {
    await files.cleanup();
  }
});

test("local team refuses insufficient available memory without starting inference", async () => {
  const files = await fixture();
  try {
    let started = false;
    const infer = await createLocalInference(files, {
      availableMemory: () => 1024,
      execute: async () => {
        started = true;
        return { stdout: "unreachable", stderr: "" };
      },
    });
    await assert.rejects(
      infer({ role: "Betty", instructions: "Fixture", input: "task" }),
      /Not enough available memory/,
    );
    assert.equal(started, false);
  } finally {
    await files.cleanup();
  }
});

test("local team rejects malformed reviewer output and releases its process slot", async () => {
  const files = await fixture();
  try {
    let calls = 0;
    const infer = await createLocalInference(files, {
      availableMemory: () => 8 * 1073741824,
      execute: async () => ({
        stdout:
          ++calls === 1
            ? '{"accepted":true,"defects":["Contradiction"]}'
            : "Recovered",
        stderr: "",
      }),
    });
    await assert.rejects(
      infer({ role: "Marcela", instructions: "Fixture", input: "task" }),
      /invalid verdict/,
    );
    assert.equal(
      await infer({ role: "Hugo", instructions: "Fixture", input: "task" }),
      "Recovered",
    );
    assert.deepEqual(await readdir(files.stateDirectory), []);
  } finally {
    await files.cleanup();
  }
});

test("local team does not run two models concurrently and respects pre-aborted work", async () => {
  const files = await fixture();
  try {
    let release!: () => void;
    let started!: () => void;
    const running = new Promise<void>((resolve) => {
      started = resolve;
    });
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const infer = await createLocalInference(files, {
      availableMemory: () => 8 * 1073741824,
      execute: async () => {
        started();
        await waiting;
        return { stdout: "Done", stderr: "" };
      },
    });
    const first = infer({
      role: "Betty",
      instructions: "Fixture",
      input: "task",
    });
    await running;
    await assert.rejects(
      infer({ role: "Hugo", instructions: "Fixture", input: "task" }),
      /busy/,
    );
    release();
    await first;
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      infer({
        role: "Betty",
        instructions: "Fixture",
        input: "task",
        signal: controller.signal,
      }),
      /abort/i,
    );
  } finally {
    await files.cleanup();
  }
});

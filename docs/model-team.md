# ORBIT local model team

## Purpose and current capability

The user's target is an online business that discovers opportunities, sells and
delivers a digital product with minimal owner operation. This feature supplies a
tested inference foundation; it does not complete acquisition, payment, deployment
or automatic delivery. The service desk remains supporting infrastructure.

The models are orchestrated, not merged or retrained:

- Qwen3-4B Q4_K_M handles planning, drafting and one requested revision.
- Qwen2.5-Coder-1.5B Instruct Q4_K_M independently reviews the supplied draft and
  evidence, returning a strictly validated JSON verdict.
- The existing Ecomoda core persists checkpoints and keeps publication and verified
  revenue separate from model output.

The initially considered 7B reviewer was deferred after measuring approximately
4.76 GiB of available memory on the development computer. The smaller specialist
is not claimed to outperform the primary model at general reasoning.

## Resource controls

`server/local-inference.ts` starts a direct subprocess with an argument array and
no command shell. It uses two CPU threads by default, a bounded context, bounded
generation and output, a per-call timeout and cancellation. One inference is
permitted at a time per adapter instance. Deployment must use a single inference
worker per shared machine unless a separate scheduler enforces shared capacity.

Before each inference, the adapter checks currently available memory against the
model file size, a 384 MiB overhead estimate and a configurable reserve of at least
1 GiB (default 1.5 GiB). This is an admission estimate, not a hard operating-system
memory limit; activity in other applications can change availability during a run.
Temporary prompts are kept in the private scratch directory and cleaned afterward.
Generated text cannot invoke tools or authorize external actions.

## Configure and use

Supply `ORBIT_LLM_BINARY`, `ORBIT_PRIMARY_MODEL` and `ORBIT_REVIEW_MODEL` together
in the deployment's private environment. The binary is `llama-completion` from the
official llama.cpp runtime; Windows uses `llama-completion.exe`. Additional options
are documented in `.env.example`. Model weights, real prompts, private environment
files and runtime state must not be committed to GitHub.

Start ORBIT normally, sign in and open **Model team**. Supply a bounded task and its
evidence. Keep the saved task ID for recovery. The authenticated artifact endpoint
can recover completed outputs; the existing status endpoint stays redacted. The
interface renders generated artifacts as plain text and never executes generated
code. A rejected review produces one revision, not automatic acceptance.

The downloaded Windows package is a development setup. Running while the owner's
computer is off requires an always-on host with an appropriate executable,
persistent storage, access controls, monitoring and sufficient compute. Open-source
model licensing does not establish free cloud hosting or automatic business income.

## Verification and limits

Four focused adapter tests cover model routing, current-memory refusal, no
concurrent inference, cancellation, malformed review rejection, cleanup and slot
recovery. The authenticated API test checks that artifacts are private while task
status remains redacted. The whole repository test suite is run separately.

In a real local smoke test, the 1.5B reviewer rejected a draft claiming completed
sales where the supplied evidence said no sales occurred. A full plan/draft/review/
revision cycle also completed. It exposed an unsupported purchase-availability
claim and imprecise review feedback; the result remained `revision_required` with
publication disallowed. Drafting instructions were tightened afterward. This is
evidence that the connection works, not a validated general quality improvement.
Further task-specific evaluation and independent artifact validation are required
before relying on automatic customer delivery. A subsequent browser run with the
tightened instructions returned a two-sentence hypothetical description and passed
model review; the interface still marked independent validation as pending. The
draft omitted the supplied price and inferred a development status, reinforcing
that model agreement is not a complete quality test.

## Official model sources

- https://huggingface.co/Qwen/Qwen3-4B-GGUF
- https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF
- https://github.com/ggml-org/llama.cpp

Both selected model repositories declare Apache-2.0. Retain their licenses and
notices. The local download package records revisions and verified SHA-256 hashes.

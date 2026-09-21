# Jev Lab

An experimental harness for learning where Jev fits inside agent workflows and comparing Jev-only decisions with an LLM loop assisted by Jev.

## What Jev does

Jev is TypeSafe's System One model. It evaluates text or structured JSON state and answers narrow, typed questions rather than generating prose. Its primitives are:

- **Choice:** select one option from a defined set and return the option distribution and confidence.
- **Noul:** return the probability that a yes/no condition is true.
- **Score:** place an item on ordered, described levels and return a probability-weighted score and confidence.

The harness should keep control flow, deterministic rules, side effects, and tool execution in code. Jev supplies bounded judgments such as routing, ranking, validation, and confidence checks. An LLM supplies generated responses and open-ended reasoning when a mode requires them.

## Goals

- Run repeatable Jev experiments and inspect the request, typed answer, probabilities, confidence, latency, and token usage.
- Compare a Jev-only workflow with an LLM agent loop that uses Jev for focused decisions.
- Make the loop and its events visible in a small browser UI.
- Start with an in-memory runtime, then add tools and sandboxed execution after the loop works.

## Experiment ideas

- **Semantic pathfinding:** Give Jev a query and a large tree of candidate locations. At each level, have it rank or select the branches most likely to contain the answer, then recursively search those branches. This could apply to codebases, document collections, or knowledge graphs.
- **Vision-guided robotics:** Use a classical vision model to turn camera frames into compact structured state such as detected objects, distances, trajectories, free space, and hazards. Give that state to Jev for higher-level action selection while deterministic control software owns movement and safety. Measure perception time and Jev decision time separately to find the real bottleneck.
- **Autoregressive Jev experiment:** Give Jev a bounded alphabet such as `a-z`, space, and punctuation, repeatedly choose the next character, and assemble the choices into text. Constrain outputs to short words and measure cumulative latency, input tokens, API calls, coherence, and cost; one-character calls may still make this expensive.
- **Trading bot signal:** Feed Jev structured market state such as spread, returns, volatility, order-book imbalance, and flow. Use its probabilities as another advisory signal while deterministic strategy and risk controls retain authority over execution.
- **UI composition:** Give Jev a catalog of allowed components, variants, and properties, then let it choose what the user needs. Ordinary application code validates the choices and assembles the interface instead of asking a generative model to write arbitrary UI code.

Inspiration: [“I reviewed 287 open-source Jev projects. Here are 20 that actually helped me understand what Jev is good at”](https://www.reddit.com/r/LLMDevs/comments/1wko2e5/i_reviewed_287_opensource_jev_projects_here_are/).
Additional Source I should review because it speaks to a future harness idea. This one is cool because it mimics the way humans work - fast decision making layer and long term skill creating layer ["Jev + Astra defeats ender dragon"](https://x.com/rronak_/status/2101544156757950697)

## Initial modes

### Jev only

The user supplies state and one or more Choice, Noul, or Score questions. FastAPI calls Jev and streams or returns the structured results for inspection. There is no agent loop or generated assistant response in this mode.

### LLM with Jev

FastAPI runs a bounded message-based agent loop. The LLM generates the assistant response and may ask the harness to run predefined Jev evaluations. The harness executes those evaluations, records the results, and gives the typed results back to the loop. Code owns the iteration limit, tool allowlist, timeouts, and stopping conditions.

The exact LLM endpoint and message protocol remain an implementation decision. The first version should support one provider only.

## First experiment: warehouse robot

The first backend experiment is intentionally small. `POST /decide` accepts one description of the robot's current situation, asks Jev whether the robot should `move`, `slow`, or `stop`, and returns Jev's structured response.

Start the server from the repository root:

```bash
cd backend
uv run uvicorn app:app --reload
```

In a second terminal, send a situation:

```bash
curl -s http://127.0.0.1:8000/decide \
  -H 'Content-Type: application/json' \
  -d '{"situation":"A worker is standing directly in front of the robot."}' \
  | python3 -m json.tool
```

FastAPI's interactive version is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

This is completed. We might get rid of this experiment as we build out the rest of Jev Lab.

## Autoregressive chat experiment

`POST /autoregressive-chat` asks Jev to build a one-word answer one letter at a time. Each iteration ranks `a-z` plus `stop`. When Choice confidence is below `0.3`, Jev chooses again from the five highest-probability options. The loop ends when Jev chooses `stop` or after 20 iterations. The response includes the word, stopping reason, number of iterations, and total token usage. The experiment history and findings are recorded in [`autoregresion-report.md`](autoregresion-report.md).

```bash
curl -s http://127.0.0.1:8000/autoregressive-chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"Which animal says meow?"}' \
  | python3 -m json.tool
```

## Architecture

- **Frontend:** a basic Next.js app for choosing a mode, entering state/questions or messages, running an experiment, and inspecting timeline events and raw structured results.
- **Backend:** a FastAPI server that owns provider credentials, validates requests, calls Jev and the LLM, and emits a common event stream for the UI.
- **Runtime:** an in-memory run store and agent loop. Runs disappear when the server restarts; persistence is intentionally deferred.
- **Providers:** thin Jev and LLM adapters so orchestration code does not depend directly on SDK response objects.

Secrets remain server-side and come from environment variables:

- `JEV_SECRET_API_KEY`
- `OPENAI_SECRET_KEY`

## Agent loop

The first loop should be deliberately small:

1. Accept the conversation and run configuration.
2. Ask the LLM for the next response.
3. If it requests an allowed Jev evaluation, execute it and append the typed result to the run.
4. Repeat until the LLM returns a final response or the iteration limit is reached.
5. Emit normalized events so the UI can show each model request, Jev judgment, result, error, and final response.

Jev questions should be narrow and explicit. Independent questions over the same state should be sent together, while confidence thresholds and routing policy stay in code.

## Delivery plan

### 1. Jev explorer

- Create the FastAPI and Next.js applications.
- Add one backend Jev client and a typed endpoint for batched questions.
- Build a minimal form and results view for Choice, Noul, and Score.
- Capture latency, usage, probabilities, confidence, errors, and raw JSON.

### 2. In-memory agent loop

- Add one LLM provider and a bounded loop.
- Expose Jev evaluation as the loop's first and only tool.
- Normalize run events and stream them to the frontend.
- Keep run state in a process-local dictionary keyed by run ID.

### 3. Evaluation harness

- Save reusable test cases outside the runtime store.
- Run the same cases in Jev-only and LLM-with-Jev modes.
- Compare output quality, decision stability, latency, token usage, and estimated cost.
- Add confidence thresholds only after observing results on representative cases.

### 4. Tools and sandboxing

- Add read-only file access as the first general tool.
- Define workspace boundaries, path validation, output limits, timeouts, and audit events.
- Choose a sandbox based on the required isolation and hosting target.
- Move tool execution into the sandbox before adding shell commands or writable files.

### 5. Deployment and persistence

- Choose Vercel or Cloudflare for the Next.js frontend.
- Choose a compatible host for the FastAPI service and streaming transport.
- Replace the in-memory store only when runs must survive restarts or work across multiple server instances.

## Deferred decisions

- The exact LLM endpoint and model.
- Server-Sent Events versus WebSockets for run events.
- Vercel versus Cloudflare for the frontend.
- The sandbox provider and isolation model.
- Durable storage, authentication, multi-user support, and production observability.

## References

- [TypeSafe documentation index](https://docs.typesafe.ai/llms.txt)
- [System One concepts](https://docs.typesafe.ai/concepts/system-one)
- [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Python SDK](https://docs.typesafe.ai/sdk/python)

## Agent tooling

Agent skills are installed locally and are not vendored into this repository. `skills-lock.json` records the skills installed through the Skills CLI. The current setup also uses the project-local Impeccable installer and the globally installed Ponytail plugin.

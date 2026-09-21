"use client";

import { FormEvent, useState } from "react";

type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

type WarehouseResponse = {
  model: string;
  usage: { input_tokens: number | null; output_tokens: number | null };
  answers: { action: ChoiceAnswer };
};

type AutoregressiveResponse = {
  answer: string;
  iterations: number;
  stop_reason: "stop" | "max_iterations";
  input_tokens: number;
  output_tokens: number;
};

type RequestState<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

const idleState = { status: "idle", data: null, error: null } as const;

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String(payload.detail)
        : `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return payload as T;
}

export function WarehousePlayground() {
  const [situation, setSituation] = useState(
    "A worker is standing directly in front of the robot.",
  );
  const [request, setRequest] =
    useState<RequestState<WarehouseResponse>>(idleState);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequest({ status: "loading", data: null, error: null });

    try {
      const data = await postJson<WarehouseResponse>("/api/backend/decide", {
        situation,
      });
      setRequest({ status: "success", data, error: null });
    } catch (error) {
      setRequest({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "The request failed.",
      });
    }
  }

  const answer = request.status === "success" ? request.data.answers.action : null;
  const probabilities = answer
    ? Object.entries(answer.probabilities).toSorted((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="playground-grid">
      <form className="experiment-form" onSubmit={submit}>
        <div className="panel-heading">
          <span>INPUT / SITUATION</span>
          <span>STRING · 1–2000</span>
        </div>
        <label htmlFor="warehouse-situation">What does the robot observe?</label>
        <textarea
          id="warehouse-situation"
          value={situation}
          onChange={(event) => setSituation(event.target.value)}
          minLength={1}
          maxLength={2000}
          required
        />
        <button type="submit" disabled={request.status === "loading"}>
          {request.status === "loading" ? "Sampling field…" : "Run Choice"}
        </button>
      </form>

      <section className="result-panel" aria-live="polite" aria-busy={request.status === "loading"}>
        <div className="panel-heading">
          <span>OUTPUT / ACTION</span>
          <span>{request.status.toUpperCase()}</span>
        </div>

        {request.status === "idle" ? (
          <p className="empty-output">Run the specimen to populate this field.</p>
        ) : null}
        {request.status === "loading" ? (
          <div className="loading-field" aria-label="Waiting for Jev" />
        ) : null}
        {request.status === "error" ? (
          <div className="error-output">
            <strong>Request failed</strong>
            <p>{request.error}</p>
            <p>Confirm that FastAPI is running and try again.</p>
          </div>
        ) : null}
        {answer && request.status === "success" ? (
          <>
            <div className="result-lead">
              <span>Selected action</span>
              <strong>{answer.choice}</strong>
              <span>{Math.round(answer.confidence * 100)}% confidence</span>
            </div>
            <div className="probability-list">
              {probabilities.map(([name, probability]) => (
                <div className="probability-row" key={name}>
                  <div>
                    <span>{name}</span>
                    <span>{probability.toFixed(2)}</span>
                  </div>
                  <span className="probability-track">
                    <span style={{ width: `${probability * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
            <dl className="result-meta">
              <div><dt>Model</dt><dd>{request.data.model}</dd></div>
              <div><dt>Input tokens</dt><dd>{request.data.usage.input_tokens ?? "—"}</dd></div>
              <div><dt>Output tokens</dt><dd>{request.data.usage.output_tokens ?? "—"}</dd></div>
            </dl>
            <details>
              <summary>Raw response</summary>
              <pre>{JSON.stringify(request.data, null, 2)}</pre>
            </details>
          </>
        ) : null}
      </section>
    </div>
  );
}

export function AutoregressivePlayground() {
  const [question, setQuestion] = useState(
    "What animal makes the meow sound and is often kept as a house pet?",
  );
  const [request, setRequest] =
    useState<RequestState<AutoregressiveResponse>>(idleState);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequest({ status: "loading", data: null, error: null });

    try {
      const data = await postJson<AutoregressiveResponse>(
        "/api/backend/autoregressive-chat",
        { question },
      );
      setRequest({ status: "success", data, error: null });
    } catch (error) {
      setRequest({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "The request failed.",
      });
    }
  }

  return (
    <div className="playground-grid">
      <form className="experiment-form" onSubmit={submit}>
        <div className="panel-heading">
          <span>INPUT / QUESTION</span>
          <span>ONE-WORD TARGET</span>
        </div>
        <label htmlFor="autoregressive-question">What should the loop answer?</label>
        <textarea
          id="autoregressive-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          minLength={1}
          maxLength={2000}
          required
        />
        <button type="submit" disabled={request.status === "loading"}>
          {request.status === "loading" ? "Building word…" : "Run character loop"}
        </button>
        <p className="form-note">
          Maximum 20 calls. A low-confidence character triggers one rerank over
          the five leading options.
        </p>
      </form>

      <section className="result-panel" aria-live="polite" aria-busy={request.status === "loading"}>
        <div className="panel-heading">
          <span>OUTPUT / WORD</span>
          <span>{request.status.toUpperCase()}</span>
        </div>
        {request.status === "idle" ? (
          <p className="empty-output">Run the loop to populate this field.</p>
        ) : null}
        {request.status === "loading" ? (
          <div className="loading-field" aria-label="Waiting for Jev" />
        ) : null}
        {request.status === "error" ? (
          <div className="error-output">
            <strong>Request failed</strong>
            <p>{request.error}</p>
            <p>Confirm that FastAPI is running and try again.</p>
          </div>
        ) : null}
        {request.status === "success" ? (
          <>
            <div className="word-output">
              <span>Assembled answer</span>
              <strong>{request.data.answer || "∅"}</strong>
              <span>{request.data.stop_reason.replace("_", " ")}</span>
            </div>
            <dl className="result-meta">
              <div><dt>Iterations</dt><dd>{request.data.iterations}</dd></div>
              <div><dt>Input tokens</dt><dd>{request.data.input_tokens}</dd></div>
              <div><dt>Output tokens</dt><dd>{request.data.output_tokens}</dd></div>
            </dl>
            <details>
              <summary>Raw response</summary>
              <pre>{JSON.stringify(request.data, null, 2)}</pre>
            </details>
          </>
        ) : null}
      </section>
    </div>
  );
}

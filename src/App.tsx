import { useState } from "react";
import type { RecognizedVerdict } from "./types";

type Status = "idle" | "loading" | "success" | "input-error" | "error";

// Client-only view state - not a mirror of server output, so it stays local
// to App.tsx rather than living in types.ts.
type HistoryEntry = { snippet: string; score: number; scoreLabel: string; timestamp: Date };

export default function App() {
  const [argumentText, setArgumentText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [verdict, setVerdict] = useState<RecognizedVerdict | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setVerdict(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ argumentText }),
      });
      const body = await res.json();

      if (res.status === 200) {
        setVerdict(body as RecognizedVerdict);
        setStatus("success");
        setHistory((prev) => [
          {
            snippet: argumentText.slice(0, 60),
            score: body.score,
            scoreLabel: body.scoreLabel,
            timestamp: new Date(),
          },
          ...prev,
        ]);
      } else if (res.status === 422) {
        setErrorMessage(body.error ?? "This doesn't look like a deductive argument.");
        setStatus("input-error");
      } else {
        setErrorMessage(body.error ?? "An unexpected error occurred. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Could not reach the server. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <main className="page">
      <h1>Logic Checker</h1>
      <p className="subtitle">
        Paste a deductive argument (premises and a conclusion) and get a structured verdict.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={argumentText}
          onChange={(e) => setArgumentText(e.target.value)}
          placeholder={
            "e.g. All men are mortal. Socrates is a man. Therefore, Socrates is mortal."
          }
          rows={8}
          disabled={status === "loading"}
        />
        <button type="submit" disabled={status === "loading" || !argumentText.trim()}>
          {status === "loading" ? "Checking…" : "Check argument"}
        </button>
      </form>

      {status === "input-error" && (
        <div className="box box-input-error">
          <strong>This doesn't look like a deductive argument.</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {status === "error" && (
        <div className="box box-error">
          <strong>Something went wrong.</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {status === "success" && verdict && <Verdict verdict={verdict} />}

      {history.length > 0 && (
        <section className="history">
          <h2>History</h2>
          <ul>
            {history.map((entry, i) => (
              <li key={i}>
                <span className={`badge badge-${entry.scoreLabel.toLowerCase()}`}>
                  {entry.score} · {entry.scoreLabel}
                </span>
                <span className="history-snippet">
                  {entry.snippet}
                  {entry.snippet.length >= 60 ? "…" : ""}
                </span>
                <time className="history-time">{entry.timestamp.toLocaleTimeString()}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Verdict({ verdict }: { verdict: RecognizedVerdict }) {
  return (
    <section className="verdict">
      <div className="badges">
        <span className={`badge badge-${verdict.validity.holds}`}>
          {verdict.validity.holds === "valid" ? "Valid" : "Invalid"}
        </span>
        <span className={`badge badge-${verdict.assessment}`}>
          {verdict.assessment === "possible"
            ? "Possibly sound"
            : verdict.assessment === "doubtful"
              ? "Doubtful premises"
              : "Soundness N/A (invalid)"}
        </span>
        <span className={`badge badge-${verdict.scoreLabel.toLowerCase()}`}>
          {verdict.score} · {verdict.scoreLabel}
        </span>
      </div>
      <p className="why">{verdict.validity.why}</p>

      <h2>Fallacies</h2>
      {verdict.fallacies.length === 0 ? (
        <p className="empty">No fallacies detected.</p>
      ) : (
        <ul>
          {verdict.fallacies.map((f, i) => (
            <li key={i}>
              <strong>{f.name}</strong>
              <p className="where">"{f.where}"</p>
              <p>{f.why}</p>
            </li>
          ))}
        </ul>
      )}

      <h2>Doubtful premises</h2>
      {verdict.soundness.length === 0 ? (
        <p className="empty">No premises were flagged as doubtful.</p>
      ) : (
        <ul>
          {verdict.soundness.map((s, i) => (
            <li key={i}>
              <p className="where">"{s.premise}"</p>
              <p>{s.why}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

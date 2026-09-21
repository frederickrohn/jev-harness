import type { Metadata } from "next";
import { AutoregressivePlayground } from "@/app/ui/playgrounds";
import { SignalField } from "@/app/ui/signal-field";

export const metadata: Metadata = {
  title: "Autoregression",
};

export default function AutoregressiveExperiment() {
  return (
    <article className="experiment-page">
      <header className="experiment-header">
        <div>
          <p className="system-line">AUTOREGRESSIVE LOOP</p>
          <h1>Jev for text generation</h1>
          <p>
            This intentionally abuses Jev by putting it into an autoregressive loop: choose one character, append it, and loop until the word is complete.
          </p>
        </div>
        <div className="header-field">
          <SignalField variant="autoregressive" label="Autoregressive signal field" />
        </div>
      </header>

      <section className="approach-section" aria-labelledby="autoregressive-approach-title">
        <h2 id="autoregressive-approach-title">Approach</h2>
        <p>
          The loop asks Jev to select the next lowercase letter or stop. Each
          selection is appended to the current prefix and returned as state in
          the next call. Low-confidence choices receive one additional ranking
          pass, and the loop ends when Jev selects stop or reaches 20 calls.
        </p>
      </section>

      <section className="playground-section" aria-labelledby="autoregressive-playground-title">
        <div className="section-heading wide">
          <h2 id="autoregressive-playground-title">Run the experiment</h2>
          <span>POST /AUTOREGRESSIVE-CHAT</span>
        </div>
        <AutoregressivePlayground />
      </section>
    </article>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function Home() {
  return (
    <div className="home-page">
      <header className="home-intro">
        <p className="system-line">HOME</p>
        <h1>Push the limits of Jev. Test where it breaks.</h1>
        <p className="home-summary">
          Jev Lab is a public workspace for testing Jev&apos;s capabilities.
          Choose an experiment from the sidebar, submit your own input, inspect the structured output, and read about the approach.
        </p>
        <dl className="home-facts">
          <div>
            <dt>Active experiments</dt>
            <dd>02</dd>
          </div>
          <div>
            <dt>Experiments</dt>
            <dd>Baseline</dd>
            <dd>Autoregression</dd>
          </div>
          <div>
            <dt>Decision model</dt>
            <dd>Jev</dd>
          </div>
        </dl>
      </header>
    </div>
  );
}

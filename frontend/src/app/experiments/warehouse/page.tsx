import type { Metadata } from "next";
import { WarehousePlayground } from "@/app/ui/playgrounds";
import { SignalField } from "@/app/ui/signal-field";

export const metadata: Metadata = {
  title: "Single Call",
};

export default function WarehouseExperiment() {
  return (
    <article className="experiment-page">
      <header className="experiment-header">
        <div>
          <p className="system-line">BASELINE</p>
          <h1>Single Jev Call</h1>
          <p>
            A small, legible Jev call: provide the observed situation as state and ask
            Jev to choose a Choice.
          </p>
        </div>
        <div className="header-field">
          <SignalField variant="baseline" label="Baseline signal field" />
        </div>
      </header>

      <section className="approach-section" aria-labelledby="warehouse-approach-title">
        <h2 id="warehouse-approach-title">Experiment Details</h2>
        <p>
          Jev is a classifier. The API allows us to ask Jev to either ask Jev to make a Choice (we provide the choices), give us a Score (we define the tiers of the scoring criteria), or provide us a Noul (basically true/false but represented as a number between 0-1).
        </p>
        <p>
          For this experiment, we&apos;ll make one single call to Jev to demonstrate how the API works. Specifically, we&apos;ll be asking it to make a choice between stop/move/slow, give it the instruction that it is a controller for a warehouse robot, and we&apos;ll inject the state through a parameter that allows us to tell Jev what situation the robot is in. This is a very simplified version of something really cool that Jev could potentially be used for - become a control layer for robotics and autonomous vehicle/navigation.
        </p>
        <p>
          Most recently, I read about someone who used Jev as a control layer for a minecraft speedrun where Jev + Astra work together to defeat the ender dragon.
        </p>
      </section>

      <section className="playground-section" aria-labelledby="warehouse-playground-title">
        <div className="section-heading wide">
          <h2 id="warehouse-playground-title">Run the experiment</h2>
          <span>POST /DECIDE</span>
        </div>
        <WarehousePlayground />
      </section>
    </article>
  );
}

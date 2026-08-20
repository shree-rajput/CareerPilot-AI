import React from "react";
export function PlaceholderPage({ title, description }) {
  return (
    <section className="content-band placeholder-band">
      <div>
        <span className="eyebrow">Coming in a later phase</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}

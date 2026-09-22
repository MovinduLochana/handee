import React from "react";

/**
 * A generic placeholder page used for scaffolding routes before their
 * definitive implementation in later phases.
 */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: "2rem", fontFamily: "var(--sans)", color: "var(--text-h)" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 600, margin: "0 0 1rem" }}>{title}</h1>
      <p style={{ color: "var(--text)", lineHeight: 1.5, maxWidth: "600px" }}>
        This page represents the <strong>{title}</strong> route. It is currently a placeholder
        awaiting full implementation in the respective development phase.
      </p>
    </div>
  );
}

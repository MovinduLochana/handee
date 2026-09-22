import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardHome() {
  return (
    <div className="animate-fade-up">
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
          color: "var(--text-h)",
          letterSpacing: "-0.03em",
        }}
      >
        Dashboard Overview
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "3rem", fontSize: "1.1rem" }}>
        Welcome back to Handee. Here's a quick summary of your operations.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
        }}
      >
        {/* Basic Stat Card */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            padding: "2rem",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            transition: "transform 0.2s",
            cursor: "default",
          }}
          className="hover-lift"
        >
          <h3
            style={{
              margin: "0 0 0.75rem",
              color: "var(--text-muted)",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            Active Bookings
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "3.5rem",
              fontWeight: 900,
              fontFamily: "var(--font-sans)",
              color: "var(--text-h)",
              lineHeight: 1,
            }}
          >
            2
          </p>
        </div>

        {/* Call to Action Stat Card (with subtle pulse denoting attention requirement) */}
        <Link to="/admin/agent-workflow" style={{ textDecoration: "none", display: "block" }}>
          <div
            style={{
              backgroundColor: "currentColor",
              color:
                "var(--accent)" /* We inherit this via currentColor for the background to make a cool tinted card */,
              padding: "2rem",
              borderRadius: "16px",
              border: "none",
              position: "relative",
              boxShadow: "var(--shadow-xl)",
              transition: "transform 0.2s var(--ease-spring)",
              cursor: "pointer",
            }}
            className="hover-lift hover-highlight-card"
          >
            <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}>
              <div className="status-indicator animate-pulse-gentle"></div>
            </div>

            <h3
              style={{
                margin: "0 0 0.75rem",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 500,
                opacity: 0.9,
              }}
            >
              Pending Approvals
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "3.5rem",
                fontWeight: 900,
                fontFamily: "var(--font-sans)",
                color: "#fff",
                lineHeight: 1,
              }}
            >
              1
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              Review Workflow <ArrowRight size={16} />
            </div>
          </div>
        </Link>

        {/* Subtle Stat Card */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            padding: "2rem",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            transition: "transform 0.2s",
            cursor: "default",
          }}
          className="hover-lift"
        >
          <h3
            style={{
              margin: "0 0 0.75rem",
              color: "var(--text-muted)",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            Total Earned (All time)
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "3.5rem",
              fontWeight: 900,
              fontFamily: "var(--font-sans)",
              color: "var(--text-h)",
              lineHeight: 1,
            }}
          >
            0
          </p>
        </div>
      </div>
    </div>
  );
}

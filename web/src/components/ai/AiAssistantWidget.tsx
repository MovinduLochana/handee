import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User, Star, CheckCircle, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { agentsApi, type AssistantQueryResponse } from "../../api/agents";
import { usersApi } from "../../api/users";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  data?: AssistantQueryResponse;
  timestamp: Date;
}

export default function AiAssistantWidget() {
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
    retry: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hello! I am your Handee AI Assistant powered by multi-agent intelligence. Tell me what trade service you need or ask for verified providers and price estimates!",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const response = await agentsApi.queryAssistant(text.trim(), userProfile?.id || "guest-customer");
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: response.reply,
        data: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "I am having trouble reaching the AI agent service. Please ensure the agent subsystem is running on port 8000.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const starterPrompts = [
    "Emergency plumbing pipe leak in Colombo",
    "Find AC Repair technicians with 4.5+ rating",
    "How much does electrical switchboard repair cost?",
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "1.75rem",
            right: "1.75rem",
            backgroundColor: "var(--accent, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            padding: "0.85rem 1.35rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
            zIndex: 9999,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Sparkles size={18} />
          <span>Ask Handee AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            width: "400px",
            maxWidth: "calc(100vw - 2rem)",
            height: "560px",
            maxHeight: "calc(100vh - 4rem)",
            backgroundColor: "var(--bg-surface, #1e293b)",
            border: "1px solid var(--border, #334155)",
            borderRadius: "16px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 99999,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "linear-gradient(135deg, var(--accent, #6366f1), #4338ca)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Handee AI Assistant</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.85,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e" }}
                  />
                  FastAPI Agent &middot; Active
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: "0.25rem",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: "1rem",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                }}
              >
                {m.sender === "assistant" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "oklch(45% 0.2 260 / 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "0.2rem",
                    }}
                  >
                    <Bot size={15} color="var(--accent)" />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      fontSize: "0.88rem",
                      lineHeight: 1.5,
                      backgroundColor:
                        m.sender === "user"
                          ? "var(--accent, #6366f1)"
                          : "var(--bg-surface-elevated, #0f172a)",
                      color: m.sender === "user" ? "#fff" : "var(--text-h, #f8fafc)",
                      border: m.sender === "assistant" ? "1px solid var(--border)" : "none",
                    }}
                  >
                    {m.text}

                    {m.data?.category && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "rgba(99, 102, 241, 0.15)",
                            color: "var(--accent, #6366f1)",
                            fontWeight: 600,
                          }}
                        >
                          Category: {m.data.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Suggested Providers Cards */}
                  {m.data?.suggested_providers && m.data.suggested_providers.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <span
                        style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}
                      >
                        Recommended Verified Specialists:
                      </span>
                      {m.data.suggested_providers.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            background: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "0.6rem 0.75rem",
                            fontSize: "0.82rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <strong style={{ color: "var(--text-h)" }}>{p.fullName}</strong>
                              {p.isVerified && <CheckCircle size={13} color="#22c55e" />}
                            </div>
                            <span
                              style={{
                                color: "#eab308",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.15rem",
                                fontWeight: 600,
                              }}
                            >
                              <Star size={12} fill="#eab308" /> {p.rating || 4.9}
                            </span>
                          </div>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.78rem",
                              marginTop: "0.2rem",
                            }}
                          >
                            Area: {p.serviceArea || "Colombo"} &middot; Rate: Rs.{" "}
                            {p.hourlyRate?.toLocaleString() || "3,500"}/hr
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Quick Chips */}
                  {m.data?.suggestions && m.data.suggestions.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.35rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {m.data.suggestions.map((sugg, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(sugg)}
                          style={{
                            background: "none",
                            border: "1px solid var(--accent)",
                            color: "var(--accent)",
                            borderRadius: "14px",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {sugg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {m.sender === "user" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "0.2rem",
                    }}
                  >
                    <User size={15} color="var(--text-muted)" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                <Bot size={16} />
                <span>AI agents analyzing query...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (if chat is fresh) */}
          {messages.length === 1 && (
            <div
              style={{
                padding: "0 1rem 0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Try asking:
              </span>
              {starterPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  style={{
                    padding: "0.4rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface-elevated)",
                    color: "var(--text)",
                    fontSize: "0.78rem",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{p}</span>
                  <ChevronRight size={13} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "0.5rem",
              background: "var(--bg-surface)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or request trade work..."
              style={{
                flex: 1,
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface-elevated)",
                color: "var(--text-h)",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: "var(--accent, #6366f1)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.6rem 0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isLoading || !input.trim() ? 0.6 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

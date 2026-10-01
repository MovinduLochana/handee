import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User, Star, CheckCircle, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { agentsApi, type AssistantQueryResponse } from "../../api/agents";
import { usersApi } from "../../api/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      const response = await agentsApi.queryAssistant(
        text.trim(),
        userProfile?.id || "guest-customer",
      );
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
        text: "I am having trouble reaching the AI agent service. Please try again shortly.",
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
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full px-5 py-6 shadow-xl gap-2 z-50 text-sm font-semibold hover:scale-105 transition-transform"
        >
          <Sparkles className="h-4 w-4" />
          <span>Ask Handee AI</span>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-4rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in fade-in duration-200">
          {/* Header */}
          <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">Handee AI Assistant</div>
                <div className="text-[11px] opacity-90 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  FastAPI Agent · Active
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 max-w-[90%] ${
                  m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {m.sender === "assistant" ? (
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}

                <div className="space-y-2">
                  <div
                    className={`p-3 rounded-xl leading-relaxed text-xs ${
                      m.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {m.text}

                    {m.data?.category && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary text-[10px]"
                        >
                          Category: {m.data.category}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Suggested Providers Cards */}
                  {m.data?.suggested_providers && m.data.suggested_providers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground block">
                        Recommended Verified Specialists:
                      </span>
                      {m.data.suggested_providers.map((p) => (
                        <div
                          key={p.id}
                          className="bg-card border border-border rounded p-2.5 text-xs space-y-1"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 font-semibold text-foreground">
                              {p.fullName}
                              {p.isVerified && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                            </div>
                            <span className="text-amber-500 flex items-center gap-0.5 font-semibold text-[11px]">
                              <Star className="h-3 w-3 fill-amber-500" /> {p.rating || 4.9}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Area: {p.serviceArea || "Colombo"} · Rate: Rs.{" "}
                            {p.hourlyRate?.toLocaleString() || "3,500"}/hr
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Quick Chips */}
                  {m.data?.suggestions && m.data.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.data.suggestions.map((sugg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(sugg)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-left"
                        >
                          {sugg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Bot className="h-4 w-4 animate-bounce" />
                <span>AI agents analyzing query...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (if chat is fresh) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 space-y-1">
              <span className="text-[11px] text-muted-foreground font-semibold block">
                Try asking:
              </span>
              {starterPrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="w-full p-2 rounded border border-border bg-muted/50 hover:bg-muted text-foreground text-xs text-left flex items-center justify-between transition-colors"
                >
                  <span className="truncate">{p}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
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
            className="p-3 border-t border-border flex gap-2 bg-card shrink-0"
          >
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or request trade work..."
              className="h-9 text-xs flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { runAssistant, type AssistantHistoryTurn } from "@/lib/actions/assistant";
import { AssistantMessageBubble } from "./message";
import { AssistantComposer } from "./composer";
import {
  summarizeResultForHistory,
  type AssistantResult,
} from "@/lib/assistant/types";

type Message =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: AssistantResult | string };

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const buildHistory = (msgs: Message[]): AssistantHistoryTurn[] =>
    msgs.slice(-6).map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : summarizeResultForHistory(m.content),
    }));

  const send = (text: string) => {
    const userMsg: Message = {
      id: `${Date.now()}-u`,
      role: "user",
      content: text,
    };
    const history = buildHistory(messages);
    setMessages((m) => [...m, userMsg]);
    startTransition(async () => {
      try {
        const result = await runAssistant(text, history);
        setMessages((m) => [
          ...m,
          { id: `${Date.now()}-a`, role: "assistant", content: result },
        ]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            id: `${Date.now()}-a`,
            role: "assistant",
            content:
              err instanceof Error ? err.message : "Something went wrong.",
          },
        ]);
      }
    });
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#dc2626] text-white shadow-lg hover:bg-[#b91c1c]"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[600px] max-h-[80vh] w-[380px] max-w-[92vw] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#dc2626]" />
              <h2 className="text-sm font-semibold text-gray-900">Assistant</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-3 bg-gray-50/40"
          >
            {messages.length === 0 ? (
              <div className="space-y-3 text-xs text-gray-500">
                <p className="font-medium text-gray-700">
                  Try asking:
                </p>
                <ul className="space-y-1.5">
                  <li>&quot;Show me leads assigned to @user-name&quot;</li>
                  <li>&quot;How many enquiries are unassigned?&quot;</li>
                  <li>&quot;Recent clients&quot;</li>
                  <li>Type <code>/</code> to jump to a page</li>
                </ul>
              </div>
            ) : (
              messages.map((m) => (
                <AssistantMessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  onLinkClick={() => setOpen(false)}
                />
              ))
            )}
            {pending && (
              <div className="text-xs text-gray-400 italic">Thinking…</div>
            )}
          </div>

          <div className="border-t border-gray-100 p-3">
            <AssistantComposer onSubmit={send} pending={pending} />
          </div>
        </div>
      )}
    </>
  );
}

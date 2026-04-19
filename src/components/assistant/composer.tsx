"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { searchAssistantUsers } from "@/lib/actions/assistant";
import { ASSISTANT_PAGES } from "@/lib/assistant/pages";

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type Suggestion =
  | { kind: "user"; option: UserOption }
  | { kind: "page"; option: (typeof ASSISTANT_PAGES)[number] };

interface Props {
  onSubmit: (text: string) => void;
  pending: boolean;
}

export function AssistantComposer({ onSubmit, pending }: Props) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const [trigger, setTrigger] = useState<null | {
    kind: "@" | "/";
    start: number;
    query: string;
  }>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);

  // Detect trigger token before caret
  const detectTrigger = (value: string, caret: number) => {
    const pre = value.slice(0, caret);
    const m = pre.match(/(^|\s)([@/])([\w-]*)$/);
    if (!m) {
      setTrigger(null);
      setSuggestions([]);
      return;
    }
    const kind = m[2] as "@" | "/";
    const query = m[3];
    const start = caret - query.length - 1; // include the trigger char
    setTrigger({ kind, start, query });
  };

  // Fetch suggestions when trigger / query changes
  useEffect(() => {
    let cancelled = false;
    if (!trigger) {
      setSuggestions([]);
      setHighlight(0);
      return;
    }
    if (trigger.kind === "/") {
      const q = trigger.query.toLowerCase();
      const items = ASSISTANT_PAGES.filter(
        (p) =>
          p.slash.slice(1).toLowerCase().startsWith(q) ||
          p.label.toLowerCase().includes(q),
      ).slice(0, 8);
      setSuggestions(items.map((option) => ({ kind: "page", option })));
      setHighlight(0);
      return;
    }
    // user lookup
    void (async () => {
      try {
        const users = await searchAssistantUsers(trigger.query);
        if (cancelled) return;
        setSuggestions(users.map((option) => ({ kind: "user", option })));
        setHighlight(0);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  const insertSuggestion = (s: Suggestion) => {
    if (!trigger) return;
    const ta = taRef.current;
    if (!ta) return;

    const before = text.slice(0, trigger.start);
    const after = text.slice(ta.selectionStart);
    let token = "";
    if (s.kind === "user") {
      token = `@[${s.option.firstName} ${s.option.lastName}](${s.option.id})`;
    } else {
      // pages: navigate immediately, don't insert
      router.push(s.option.href);
      // close picker by trimming the slash query
      const cleaned = before + after;
      setText(cleaned);
      setTrigger(null);
      setSuggestions([]);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(before.length, before.length);
      });
      return;
    }
    const next = `${before}${token} ${after}`;
    setText(next);
    setTrigger(null);
    setSuggestions([]);
    const caret = before.length + token.length + 1;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[highlight]);
        return;
      }
      if (e.key === "Escape") {
        setTrigger(null);
        setSuggestions([]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const t = text.trim();
    if (!t || pending) return;
    onSubmit(t);
    setText("");
    setTrigger(null);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      {suggestions.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 right-0 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg z-10">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertSuggestion(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs ${
                i === highlight ? "bg-red-50" : "hover:bg-gray-50"
              }`}
            >
              {s.kind === "user" ? (
                <>
                  <div>
                    <p className="font-medium text-gray-900">
                      {s.option.firstName} {s.option.lastName}
                    </p>
                    <p className="text-[10px] text-gray-500">{s.option.email}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">@user</span>
                </>
              ) : (
                <>
                  <div>
                    <p className="font-medium text-gray-900">{s.option.label}</p>
                    <p className="text-[10px] text-gray-500">
                      {s.option.description}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">
                    {s.option.slash}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-2">
        <textarea
          ref={taRef}
          value={text}
          rows={2}
          placeholder="Ask anything. @user to mention, / to navigate."
          onChange={(e) => {
            setText(e.target.value);
            detectTrigger(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={onKey}
          className="flex-1 resize-none border-0 bg-transparent text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || pending}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

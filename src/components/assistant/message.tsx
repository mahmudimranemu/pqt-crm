"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AssistantResult } from "@/lib/assistant/types";

export function AssistantMessageBubble({
  role,
  content,
  onLinkClick,
}: {
  role: "user" | "assistant";
  content: string | AssistantResult;
  onLinkClick?: () => void;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-[#dc2626] text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm"
        }`}
      >
        {typeof content === "string" ? (
          <p className="whitespace-pre-wrap">{renderUserText(content)}</p>
        ) : (
          <ResultBody result={content} onLinkClick={onLinkClick} />
        )}
      </div>
    </div>
  );
}

function ResultBody({
  result,
  onLinkClick,
}: {
  result: AssistantResult;
  onLinkClick?: () => void;
}) {
  if (result.kind === "compound") {
    return (
      <div className="space-y-3">
        <p className="font-semibold">{result.title}</p>
        {result.results.map((r, i) => (
          <div key={i} className="rounded-md bg-white border border-gray-100 p-2">
            <ResultBody result={r} onLinkClick={onLinkClick} />
          </div>
        ))}
      </div>
    );
  }
  if (result.kind === "text") {
    return <p className="whitespace-pre-wrap">{result.text}</p>;
  }
  if (result.kind === "count") {
    return (
      <div>
        <p className="text-xs text-gray-500">{result.label}</p>
        <p className="text-xl font-bold">{result.value.toLocaleString()}</p>
        {result.href && (
          <Link
            href={result.href}
            onClick={onLinkClick}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#dc2626] hover:underline"
          >
            View <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  }
  // list
  return (
    <div className="space-y-2">
      <p className="font-medium">{result.title}</p>
      {result.items.length === 0 ? (
        <p className="text-xs text-gray-500">No matches.</p>
      ) : (
        <ul className="space-y-1">
          {result.items.map((it, i) => (
            <li key={i}>
              <Link
                href={it.href}
                onClick={onLinkClick}
                className="block rounded bg-white px-2 py-1.5 text-xs hover:bg-gray-50 border border-gray-100"
              >
                <p className="font-medium text-gray-900 truncate">{it.title}</p>
                {it.subtitle && (
                  <p className="text-[10px] text-gray-500 truncate">{it.subtitle}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {result.viewAllHref && result.total > result.items.length && (
        <Link
          href={result.viewAllHref}
          onClick={onLinkClick}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#dc2626] hover:underline"
        >
          All {result.total} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// Render user text — keep mention chips visible as @Name (strip the trailing ID)
function renderUserText(text: string) {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
}

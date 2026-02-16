"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadContactLog, deleteLeadNote } from "@/lib/actions/leads";
import {
  MessageSquare,
  Send,
  Trash2,
  Phone,
  Mail,
  Users,
  StickyNote,
  Loader2,
} from "lucide-react";

type ContactType = "CALL" | "EMAIL" | "SPOKEN" | "NOTE";

const CONTACT_TYPES: {
  key: ContactType;
  label: string;
  icon: typeof Phone;
  color: string;
  bg: string;
}[] = [
  {
    key: "CALL",
    label: "Call",
    icon: Phone,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    key: "EMAIL",
    label: "Email",
    icon: Mail,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  {
    key: "SPOKEN",
    label: "Spoken",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  {
    key: "NOTE",
    label: "Note",
    icon: StickyNote,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
  },
];

const typeIcons: Record<string, { icon: typeof Phone; color: string }> = {
  "[CALL]": { icon: Phone, color: "text-blue-600" },
  "[EMAIL]": { icon: Mail, color: "text-purple-600" },
  "[SPOKEN]": { icon: Users, color: "text-emerald-600" },
};

interface LeadNotesProps {
  leadId: string;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    agent: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

function parseNoteContent(content: string) {
  for (const [prefix, meta] of Object.entries(typeIcons)) {
    if (content.startsWith(prefix + " ")) {
      return {
        type: prefix.replace(/[\[\]]/g, ""),
        icon: meta.icon,
        color: meta.color,
        text: content.slice(prefix.length + 1),
      };
    }
  }
  return {
    type: "NOTE",
    icon: StickyNote,
    color: "text-gray-500",
    text: content,
  };
}

export function LeadNotes({ leadId, notes }: LeadNotesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [contactType, setContactType] = useState<ContactType>("CALL");

  function handleSubmit() {
    if (!content.trim()) return;
    const noteContent = content;
    const noteType = contactType;
    setContent("");
    startTransition(async () => {
      await addLeadContactLog(leadId, {
        contactType: noteType,
        content: noteContent,
      });
      router.refresh();
    });
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      await deleteLeadNote(noteId);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notes & Contact Log ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact type selector */}
        <div className="flex gap-2">
          {CONTACT_TYPES.map((type) => {
            const isActive = contactType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => setContactType(type.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? `${type.bg} ${type.color} ring-1 ring-current`
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <type.icon className="h-3.5 w-3.5" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Note input */}
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              contactType === "CALL"
                ? "Log call details..."
                : contactType === "EMAIL"
                  ? "Log email details..."
                  : contactType === "SPOKEN"
                    ? "Log conversation details..."
                    : "Add a note..."
            }
            rows={2}
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isPending}
            size="icon"
            className="h-auto bg-[#dc2626] hover:bg-[#b91c1c] text-white shrink-0"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Notes timeline */}
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No notes yet. Log a call, email, or add a note above.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const parsed = parseNoteContent(note.content);
              const TypeIcon = parsed.icon;
              return (
                <div
                  key={note.id}
                  className="group flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      parsed.type === "CALL"
                        ? "bg-blue-100"
                        : parsed.type === "EMAIL"
                          ? "bg-purple-100"
                          : parsed.type === "SPOKEN"
                            ? "bg-emerald-100"
                            : "bg-gray-200"
                    }`}
                  >
                    <TypeIcon className={`h-4 w-4 ${parsed.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-900">
                          {note.agent.firstName} {note.agent.lastName}
                        </p>
                        {parsed.type !== "NOTE" && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              parsed.type === "CALL"
                                ? "bg-blue-100 text-blue-700"
                                : parsed.type === "EMAIL"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {parsed.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(note.createdAt).toLocaleDateString()}{" "}
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={isPending}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {parsed.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

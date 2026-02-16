"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  Clock,
  Phone,
  Mail,
  Users,
  StickyNote,
} from "lucide-react";
import {
  addEnquiryContactLog,
  deleteEnquiryNote,
} from "@/lib/actions/enquiries";

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

const typeIcons: Record<
  string,
  { icon: typeof Phone; color: string; bgColor: string }
> = {
  "[CALL]": { icon: Phone, color: "text-blue-600", bgColor: "bg-blue-100" },
  "[EMAIL]": { icon: Mail, color: "text-purple-600", bgColor: "bg-purple-100" },
  "[SPOKEN]": {
    icon: Users,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
};

interface Note {
  id: string;
  content: string;
  createdAt: string;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface EnquiryNotesProps {
  enquiryId: string;
  notes: Note[];
}

function parseNoteContent(content: string) {
  for (const [prefix, meta] of Object.entries(typeIcons)) {
    if (content.startsWith(prefix + " ")) {
      return {
        type: prefix.replace(/[\[\]]/g, ""),
        icon: meta.icon,
        color: meta.color,
        bgColor: meta.bgColor,
        text: content.slice(prefix.length + 1),
      };
    }
  }
  return {
    type: "NOTE",
    icon: StickyNote,
    color: "text-gray-500",
    bgColor: "bg-gray-200",
    text: content,
  };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EnquiryNotes({ enquiryId, notes }: EnquiryNotesProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [contactType, setContactType] = useState<ContactType>("CALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addEnquiryContactLog(enquiryId, {
        contactType,
        content: content.trim(),
      });
      setContent("");
      toast({
        title: `${contactType.charAt(0) + contactType.slice(1).toLowerCase()} logged`,
        description: "Contact log has been added to the timeline.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add note",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await deleteEnquiryNote(noteId);
      toast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete note",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-[#dc2626]" />
          Notes & Contact Log
          <span className="ml-auto text-sm font-normal text-gray-400">
            {notes.length} {notes.length === 1 ? "entry" : "entries"}
          </span>
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
            className="text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            size="icon"
            className="h-auto bg-[#dc2626] hover:bg-[#b91c1c] text-white shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Timeline */}
        {notes.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No notes yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Log a call, email, or add a note above.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-0">
              {notes.map((note) => {
                const parsed = parseNoteContent(note.content);
                const TypeIcon = parsed.icon;
                return (
                  <div
                    key={note.id}
                    className="relative flex gap-3 pb-5 last:pb-0 group"
                  >
                    {/* Timeline icon */}
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${parsed.bgColor}`}
                      >
                        <TypeIcon className={`h-4 w-4 ${parsed.color}`} />
                      </div>
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 min-w-0">
                      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                        {/* Note Header */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900">
                              {note.agent.firstName} {note.agent.lastName}
                            </span>
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
                            <span
                              className="flex items-center gap-1 text-xs text-gray-400"
                              title={formatFullDate(note.createdAt)}
                            >
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(note.createdAt)}
                            </span>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={deletingId === note.id}
                              className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-red-50 text-gray-400 hover:text-red-500"
                              title="Delete note"
                            >
                              {deletingId === note.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Note Body */}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {parsed.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { MessageSquare, Send, Loader2, Trash2, Clock } from "lucide-react";
import { addEnquiryNote, deleteEnquiryNote } from "@/lib/actions/enquiries";

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

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      await addEnquiryNote(enquiryId, newNote);
      setNewNote("");
      toast({
        title: "Note added",
        description: "Your note has been added to the timeline.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add note",
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
        description: error instanceof Error ? error.message : "Failed to delete note",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddNote();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-[#dc2626]" />
          Notes & Activity Log
          <span className="ml-auto text-sm font-normal text-gray-400">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Note Form */}
        <div className="space-y-3">
          <Textarea
            placeholder="Add a note... (Ctrl+Enter to submit)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="resize-none focus-visible:ring-[#dc2626]/20 focus-visible:border-[#dc2626]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddNote}
              disabled={isSubmitting || !newNote.trim()}
              className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              size="sm"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Add Note
            </Button>
          </div>
        </div>

        {/* Timeline */}
        {notes.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No notes yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Add a note to start tracking activity for this enquiry.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-0">
              {notes.map((note, index) => (
                <div key={note.id} className="relative flex gap-4 pb-6 last:pb-0 group">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dc2626] text-white text-xs font-semibold shadow-sm">
                      {getInitials(note.agent.firstName, note.agent.lastName)}
                    </div>
                  </div>

                  {/* Note Content */}
                  <div className="flex-1 min-w-0">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Note Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {note.agent.firstName} {note.agent.lastName}
                          </span>
                          <span className="text-xs text-gray-400">&middot;</span>
                          <span
                            className="flex items-center gap-1 text-xs text-gray-400"
                            title={formatFullDate(note.createdAt)}
                          >
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(note.createdAt)}
                          </span>
                        </div>
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

                      {/* Note Body */}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>

                      {/* Timestamp on hover */}
                      <p className="text-[10px] text-gray-300 mt-2">
                        {formatFullDate(note.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

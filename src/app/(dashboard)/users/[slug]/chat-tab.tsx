"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { getMessages, sendMessage } from "@/lib/actions/user-profile";

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  createdAt: Date | string;
  sender: { firstName: string; lastName: string };
}

interface ChatTabProps {
  otherUserId: string;
  otherUserName: string;
  currentUserId: string;
}

export function ChatTab({ otherUserId, otherUserName, currentUserId }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const data = await getMessages(otherUserId);
      setMessages(data);
    } catch {
      // Silently fail on poll errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || isPending) return;

    const content = newMessage.trim();
    setNewMessage("");

    startTransition(async () => {
      try {
        const msg = await sendMessage(otherUserId, content);
        setMessages((prev) => [...prev, { ...msg, isRead: false }]);
      } catch {
        setNewMessage(content);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const msgDate = formatDate(msg.createdAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  if (loading) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#dc2626]" />
            <p className="text-sm text-gray-500">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Chat with {otherUserName}
          </h2>
          <p className="text-sm text-gray-500">
            Direct messages between you and {otherUserName}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="h-[500px] overflow-y-auto p-5 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No messages yet.</p>
              <p className="mt-1 text-sm text-gray-400">
                Start a conversation with {otherUserName}
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">
                  {group.date}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isSent = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isSent
                            ? "bg-[#dc2626] text-white rounded-br-md"
                            : "bg-gray-100 text-gray-900 rounded-bl-md"
                        }`}
                      >
                        {!isSent && (
                          <p className="mb-0.5 text-xs font-medium text-gray-500">
                            {msg.sender.firstName} {msg.sender.lastName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isSent ? "text-red-200" : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-end gap-3">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUserName}...`}
            className="min-h-[44px] max-h-[120px] resize-none border-gray-200 focus:border-[#dc2626] focus:ring-[#dc2626]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isPending}
            className="h-[44px] bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          Press Cmd+Enter to send
        </p>
      </div>
    </Card>
  );
}

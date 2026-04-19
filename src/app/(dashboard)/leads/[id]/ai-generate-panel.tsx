"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, Loader2, MessageSquare, Mail, RefreshCw, Send } from "lucide-react";
import {
  generateLeadEmail,
  generateLeadWhatsApp,
  sendLeadEmail,
} from "@/lib/actions/ai-settings";

interface Props {
  leadId: string;
  clientEmail: string;
  clientPhone: string | null;
  clientWhatsapp: string | null;
}

export function AIGeneratePanel({
  leadId,
  clientEmail,
  clientPhone,
  clientWhatsapp,
}: Props) {
  const [waOpen, setWaOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const [waText, setWaText] = useState("");
  const [waPending, startWaTransition] = useTransition();

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTo, setEmailTo] = useState(clientEmail);
  const [emailGenPending, startEmailGen] = useTransition();
  const [emailSendPending, startEmailSend] = useTransition();

  const waTarget = clientWhatsapp?.trim() || clientPhone?.trim() || "";

  const generateWa = () => {
    setWaOpen(true);
    startWaTransition(async () => {
      try {
        const { text } = await generateLeadWhatsApp(leadId);
        setWaText(text);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
        setWaOpen(false);
      }
    });
  };

  const generateEmail = () => {
    setEmailOpen(true);
    startEmailGen(async () => {
      try {
        const { subject, body } = await generateLeadEmail(leadId);
        setEmailSubject(subject);
        setEmailBody(body);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
        setEmailOpen(false);
      }
    });
  };

  const openWhatsApp = () => {
    const phone = waTarget.replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (!phone) {
      toast({
        variant: "destructive",
        title: "No WhatsApp number",
        description: "Add a phone or WhatsApp number to the client first.",
      });
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendEmail = () => {
    startEmailSend(async () => {
      try {
        await sendLeadEmail({
          leadId,
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
        });
        toast({ title: "Email sent" });
        setEmailOpen(false);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Send failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#dc2626]" />
            AI Outreach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={generateWa}
              disabled={waPending}
              className="justify-start"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={generateEmail}
              disabled={emailGenPending}
              className="justify-start"
            >
              <Mail className="mr-2 h-4 w-4" />
              Generate Email
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Drafts are generated from this lead&apos;s notes, client info, and
            interested property. You can edit before sending.
          </p>
        </CardContent>
      </Card>

      {/* WhatsApp dialog */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>WhatsApp message draft</DialogTitle>
            <DialogDescription>
              Edit the message, then open WhatsApp to send it from your account.
            </DialogDescription>
          </DialogHeader>
          {waPending ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">To</Label>
                <p className="text-sm font-mono">{waTarget || "(no number)"}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wa-msg">Message</Label>
                <Textarea
                  id="wa-msg"
                  rows={8}
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={generateWa}
              disabled={waPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button
              onClick={openWhatsApp}
              disabled={waPending || !waText.trim()}
              className="bg-[#dc2626] hover:bg-[#b91c1c]"
            >
              <Send className="mr-2 h-4 w-4" />
              Open in WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Email draft</DialogTitle>
            <DialogDescription>
              Edit the subject and body, then send.
            </DialogDescription>
          </DialogHeader>
          {emailGenPending ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="email-to">To</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-body">Body</Label>
                <Textarea
                  id="email-body"
                  rows={12}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={generateEmail}
              disabled={emailGenPending || emailSendPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button
              onClick={sendEmail}
              disabled={
                emailGenPending ||
                emailSendPending ||
                !emailTo.trim() ||
                !emailSubject.trim() ||
                !emailBody.trim()
              }
              className="bg-[#dc2626] hover:bg-[#b91c1c]"
            >
              {emailSendPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

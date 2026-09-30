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
import { Sparkles, Loader2, MessageSquare, Mail, RefreshCw, Send, ScanSearch } from "lucide-react";
import {
  generateLeadEmail,
  generateLeadWhatsApp,
  sendLeadEmail,
} from "@/lib/actions/ai-settings";
import { analyseLead, type LeadAnalysisState } from "@/lib/actions/lead-analysis";
import { LeadAnalysisPanel } from "./lead-analysis-panel";

interface Props {
  leadId: string;
  clientEmail: string;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  /** Saved analysis for this lead; null when the user can't run it. */
  analysisState: LeadAnalysisState | null;
  userId: string;
}

export function AIGeneratePanel({
  leadId,
  clientEmail,
  clientPhone,
  clientWhatsapp,
  analysisState,
  userId,
}: Props) {
  const [analysis, setAnalysis] = useState(analysisState);
  const [analysing, startAnalysis] = useTransition();
  // The "Draft this message" plan from the analysis, used by Regenerate too.
  const [plan, setPlan] = useState<string | undefined>(undefined);
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

  const runAnalysis = () =>
    startAnalysis(async () => {
      const res = await analyseLead(leadId);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Analysis failed", description: res.error });
        return;
      }
      setAnalysis(res.state);
      if (res.cached) {
        toast({ title: "No new activity", description: "Showing the saved analysis." });
      }
    });

  const draftFromAnalysis = (channel: string, nextPlan: string) => {
    setPlan(nextPlan);
    if (channel === "email") generateEmail(nextPlan);
    else generateWa(nextPlan);
  };

  const generateWa = (withPlan?: string) => {
    setWaOpen(true);
    startWaTransition(async () => {
      const res = await generateLeadWhatsApp(leadId, withPlan);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Generation failed", description: res.error });
        setWaOpen(false);
        return;
      }
      setWaText(res.text);
    });
  };

  const generateEmail = (withPlan?: string) => {
    setEmailOpen(true);
    startEmailGen(async () => {
      const res = await generateLeadEmail(leadId, withPlan);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Generation failed", description: res.error });
        setEmailOpen(false);
        return;
      }
      setEmailSubject(res.subject);
      setEmailBody(res.body);
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
          <div
            className={`grid grid-cols-1 gap-2 ${analysis ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            {analysis && (
              <Button
                variant="outline"
                onClick={runAnalysis}
                disabled={analysing}
                className="justify-start"
              >
                {analysing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="mr-2 h-4 w-4" />
                )}
                Analysis
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setPlan(undefined);
                generateWa();
              }}
              disabled={waPending}
              className="justify-start"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPlan(undefined);
                generateEmail();
              }}
              disabled={emailGenPending}
              className="justify-start"
            >
              <Mail className="mr-2 h-4 w-4" />
              Generate Email
            </Button>
          </div>
          {analysing && analysis && (
            <p className="mt-2 flex items-center text-xs text-gray-600">
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Reading {analysis.counts.notes} note{analysis.counts.notes === 1 ? "" : "s"} and{" "}
              {analysis.counts.activities} activit{analysis.counts.activities === 1 ? "y" : "ies"}…
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {analysis
              ? "Analysis and drafts are generated from this lead's notes, activity and fields. Nothing changes until you click Apply."
              : "Drafts are generated from this lead's notes, client info, and interested property. You can edit before sending."}
          </p>
          {analysis && (
            <LeadAnalysisPanel
              state={analysis}
              userId={userId}
              onStateChange={setAnalysis}
              onRerun={runAnalysis}
              onDraft={draftFromAnalysis}
              rerunning={analysing}
            />
          )}
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
              onClick={() => generateWa(plan)}
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
              onClick={() => generateEmail(plan)}
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

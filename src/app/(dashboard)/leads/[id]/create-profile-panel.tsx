"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, Loader2, RefreshCw, Save, UserCog, ExternalLink } from "lucide-react";
import {
  generateClientProfile,
  saveClientProfile,
} from "@/lib/actions/client-profile";
import { type ClientProfile } from "@/lib/profile/schema";
import { ProfileForm } from "@/components/profile/profile-form";

export function CreateProfilePanel({
  leadId,
  clientId,
}: {
  leadId: string;
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [genPending, startGen] = useTransition();
  const [savePending, startSave] = useTransition();

  const run = (overrides?: Partial<ClientProfile>) => {
    setOpen(true);
    startGen(async () => {
      const res = await generateClientProfile(leadId, overrides);
      if (!res.ok) {
        toast({ title: "Couldn't generate profile", description: res.error, variant: "destructive" });
        return;
      }
      setProfile(res.profile);
      setMissing(res.missing);
    });
  };

  const save = () => {
    if (!profile) return;
    startSave(async () => {
      const res = await saveClientProfile(leadId, profile);
      if (!res.ok) {
        toast({ title: "Couldn't save", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profile saved", description: "It's now on the client's Profile tab." });
      setOpen(false);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCog className="h-4 w-4 text-[#dc2626]" />
          Client Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={() => run()}
          disabled={genPending}
          className="w-full justify-start"
        >
          {genPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Create Profile
        </Button>
        <p className="mt-2 text-xs text-gray-500">
          The AI drafts a structured profile from this lead, its notes and the
          interested property. Review, fill any gaps, then save it to the client.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client profile draft</DialogTitle>
            <DialogDescription>
              AI-generated from this lead. Edit anything, then save it to the client.
            </DialogDescription>
          </DialogHeader>

          {genPending && !profile ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Generating…
            </div>
          ) : profile ? (
            <>
              {missing.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Still missing the minimum to be useful: {missing.join(", ")}.
                  Fill these in before saving.
                </div>
              )}
              <ProfileForm value={profile} onChange={setProfile} />
            </>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Link
              href={`/clients/${clientId}`}
              className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> View client
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => run()}
                disabled={genPending || savePending}
              >
                <RefreshCw className={"mr-2 h-4 w-4" + (genPending ? " animate-spin" : "")} />
                Regenerate
              </Button>
              <Button onClick={save} disabled={!profile || savePending || genPending}>
                {savePending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save to client
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

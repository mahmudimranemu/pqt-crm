"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Pencil, Plus, Save, Loader2 } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import { updateClientProfile } from "@/lib/actions/client-profile";
import { normalizeProfile, type ClientProfile } from "@/lib/profile/schema";

/**
 * Lets an agent manually create or edit a client's profile straight from the
 * client page — independent of the AI/lead flow.
 */
export function ClientProfileEditor({
  clientId,
  initialProfile,
}: {
  clientId: string;
  initialProfile: ClientProfile | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>(
    normalizeProfile(initialProfile),
  );
  const [pending, start] = useTransition();
  const hasProfile = initialProfile != null;

  // Reset the draft to the latest saved profile whenever the dialog opens.
  const openEditor = () => {
    setProfile(normalizeProfile(initialProfile));
    setOpen(true);
  };

  const save = () => {
    start(async () => {
      const res = await updateClientProfile(clientId, profile);
      if (!res.ok) {
        toast({ title: "Couldn't save", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profile saved" });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openEditor}>
        {hasProfile ? (
          <>
            <Pencil className="mr-2 h-4 w-4" /> Edit profile
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" /> Add profile
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{hasProfile ? "Edit client profile" : "Add client profile"}</DialogTitle>
            <DialogDescription>
              Update any field by hand. Intent drives which extra sections appear.
            </DialogDescription>
          </DialogHeader>

          <ProfileForm value={profile} onChange={setProfile} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

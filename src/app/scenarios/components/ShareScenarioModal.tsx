"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ShareScenarioModal({ open, onClose, scenarioId }: {
  open: boolean;
  onClose: () => void;
  scenarioId: string;
}) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [status, setStatus] = useState<string | null>(null);

  const share = async () => {
    const res = await fetch("/api/share-scenario", {
      method: "POST",
      body: JSON.stringify({ scenarioId, targetEmail: email, permission }),
    });

    const data = await res.json();
    setStatus(data.message || data.error);
    if (data.success) {
      setTimeout(() => {
        setEmail("");
        setStatus(null);
        onClose();
      }, 1500);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Scenario</DialogTitle>
        </DialogHeader>
        <Input
          type="email"
          placeholder="Recipient's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <Button variant={permission === "view" ? "default" : "outline"} onClick={() => setPermission("view")}>
            View
          </Button>
          <Button variant={permission === "edit" ? "default" : "outline"} onClick={() => setPermission("edit")}>
            Edit
          </Button>
        </div>
        <Button onClick={share} className="mt-4 w-full">Share</Button>
        {status && <p className="mt-2 text-sm text-center text-purple-400">{status}</p>}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ShareScenarioDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  scenarioId: string;
}

export default function ShareScenarioDialog({
  children,
  open,
  onOpenChange,
  scenarioId
}: ShareScenarioDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setStatus(null);
    
    try {
      const res = await fetch("/api/share-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ scenarioId, targetEmail: email, permission }),
      });

      const data = await res.json();
      setStatus(data.message || data.error);
      
      if (data.success) {
        setTimeout(() => {
          resetForm();
          if (onOpenChange) {
            onOpenChange(false);
          }
        }, 1500);
      }
    } catch (error) {
      setStatus("An error occurred while sharing the scenario");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPermission("view");
    setStatus(null);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (onOpenChange) onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md bg-zinc-900 text-white border-purple-600">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Share Scenario</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Recipient&apos;s Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 focus:border-purple-500 text-white"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-white">Permission Level</Label>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={permission === "view" ? "default" : "outline"} 
                onClick={() => setPermission("view")}
                className={permission === "view" ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-300 hover:bg-purple-700 text-black border-purple-600"}
              >
                View Only
              </Button>
              <Button 
                type="button"
                variant={permission === "edit" ? "default" : "outline"} 
                onClick={() => setPermission("edit")}
                className={permission === "edit" ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-300 hover:bg-purple-700 text-black border-purple-600"}
              >
                View & Edit
              </Button>
            </div>
          </div>
          
          {status && (
            <div className={`p-2 text-sm rounded text-center ${
              status.toLowerCase().includes("error") ? "bg-red-900/30 text-red-300" : "bg-green-900/30 text-green-300"
            }`}>
              {status}
            </div>
          )}
          
          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              onClick={handleShare} 
              disabled={!email || isLoading}
              className={`w-full ${
                !email || isLoading ? "bg-zinc-600 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isLoading ? "Sharing..." : "Share Scenario"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

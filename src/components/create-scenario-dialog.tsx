"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CreateScenarioDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
}

export default function CreateScenarioDialog({
  children,
  open,
  onOpenChange,
  title = "Create New Scenario"
}: CreateScenarioDialogProps) {
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const router = useRouter();

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Navigate to create page with query params
    router.push(`/scenarios/create?name=${encodeURIComponent(scenarioName)}&description=${encodeURIComponent(scenarioDescription)}`);
    
    // Reset form and close dialog
    resetForm();
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setScenarioName("");
    setScenarioDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (onOpenChange) onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-900 text-white border-purple-600">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateScenario} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Scenario Name</Label>
            <Input 
              id="name" 
              value={scenarioName} 
              onChange={(e) => setScenarioName(e.target.value)} 
              className="bg-zinc-800 border-zinc-700 focus:border-purple-500 text-white"
              placeholder="Enter scenario name" 
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea 
              id="description" 
              value={scenarioDescription} 
              onChange={(e) => setScenarioDescription(e.target.value)} 
              className="bg-zinc-800 border-zinc-700 focus:border-purple-500 text-white min-h-[100px]"
              placeholder="Briefly describe your scenario (Optional)" 
            />
          </div>
          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700 w-full"
              disabled={!scenarioName}
            >
              Create Scenario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
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
import { AlertCircle } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: scenarioName,
          description: scenarioDescription,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.scenario) {
        // Navigate to the created scenario page
        router.push(`/scenarios/${data.scenario._id}`);
        
        // Reset form and close dialog
        resetForm();
        if (onOpenChange) {
          onOpenChange(false);
        }
      } else {
        console.error('Failed to create scenario:', data.error);
        setError(data.error || 'Failed to create scenario');
      }
    } catch (error) {
      console.error('Error creating scenario:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setScenarioName("");
    setScenarioDescription("");
    setError(null);
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
          {error && (
            <div className="bg-red-900/30 border border-red-600 p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
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
              disabled={!scenarioName || isLoading}
            >
              {isLoading ? "Creating..." : "Create Scenario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
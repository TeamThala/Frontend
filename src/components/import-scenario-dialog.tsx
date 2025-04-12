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

interface ImportScenarioDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ImportScenarioDialog({
  children,
  open,
  onOpenChange
}: ImportScenarioDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.yaml') || selectedFile.name.endsWith('.yml')) {
        setFile(selectedFile);
        setError("");
      } else {
        setFile(null);
        setError("Please select a YAML file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import-scenario", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Scenario imported successfully!");
        setTimeout(() => {
          router.push("/scenarios");
          if (onOpenChange) {
            onOpenChange(false);
          }
        }, 2000);
      } else {
        setError(result.error || "Failed to import scenario");
      }
    } catch (err) {
      setError("An error occurred while importing the scenario");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setError("");
    setSuccess("");
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
          <DialogTitle className="text-xl font-bold">Import Scenario</DialogTitle>
        </DialogHeader>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-white">Upload YAML File</Label>
            <input
              id="file-upload"
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileChange}
              className="block w-full text-sm text-white
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-purple-600 file:text-white
                       hover:file:bg-purple-500"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Only YAML files are supported (.yaml, .yml)
            </p>
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || !file}
              className={`w-full ${
                isLoading || !file
                  ? "bg-zinc-600 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isLoading ? "Importing..." : "Import Scenario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportScenario() {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Import Scenario
        </h1>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Upload YAML File
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-violet-50 file:text-violet-700
                         hover:file:bg-violet-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only YAML files are supported (.yaml, .yml)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm text-violet-600 hover:text-violet-500"
            >
              Back to Home
            </Link>
            <button
              type="submit"
              disabled={isLoading || !file}
              className={`py-2 px-4 rounded-md text-white font-medium ${
                isLoading || !file
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              {isLoading ? "Importing..." : "Import Scenario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function ScenarioSkeleton() {
  return (
    <Card className="bg-black text-white border-[#7F56D9]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="h-8 w-36 bg-zinc-900 rounded animate-pulse"></div>
          <div className="h-6 w-20 bg-zinc-900 rounded animate-pulse border border-[#8F4DA2]"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="h-5 w-44 bg-zinc-900 rounded animate-pulse"></div>
          
          <div>
            <div className="h-6 w-28 bg-zinc-900 rounded mb-3 animate-pulse"></div>
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-24 bg-zinc-900 rounded-full animate-pulse border border-[#FF4690]"></div>
              <div className="h-8 w-20 bg-zinc-900 rounded-full animate-pulse border border-[#FF4690]"></div>
              <div className="h-8 w-28 bg-zinc-900 rounded-full animate-pulse border border-[#FF4690]"></div>
            </div>
          </div>
          
          <div>
            <div className="h-6 w-20 bg-zinc-900 rounded mb-3 animate-pulse"></div>
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-28 bg-zinc-900 rounded-full animate-pulse border border-[#702DFF]"></div>
              <div className="h-8 w-24 bg-zinc-900 rounded-full animate-pulse border border-[#702DFF]"></div>
              <div className="h-8 w-20 bg-zinc-900 rounded-full animate-pulse border border-[#702DFF]"></div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-zinc-800 pt-4">
        <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-zinc-900 rounded animate-pulse"></div>
          <div className="h-9 w-20 bg-zinc-900 rounded animate-pulse"></div>
          <div className="h-9 w-20 bg-zinc-900 rounded animate-pulse"></div>
        </div>
      </CardFooter>
    </Card>
  );
} 
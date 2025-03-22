"use client";

import { useEffect, useState, ReactNode } from "react";

interface ClientWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ClientWrapper({ 
  children, 
  fallback = null 
}: ClientWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return fallback;
  }
  
  return <>{children}</>;
} 
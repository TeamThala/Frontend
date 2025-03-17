"use client";

import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const Header = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isMounted, setIsMounted] = useState(false);

  // Ensures hydration issues do not occur
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Navigation links
  const navLinks = [
    { name: "Home", href: "/", isActive: pathname === "/" },
    { name: "Dashboard", href: "/dashboard", isActive: pathname.startsWith("/dashboard") },
    { name: "Scenarios", href: "/scenarios", isActive: pathname.startsWith("/scenarios") },
    { name: "Simulations", href: "/simulation", isActive: pathname.startsWith("/simulation") },
  ];

  return (
    <header className="bg-black text-white p-4 flex justify-between items-center sticky top-0 z-50">
    {/* Logo */}
    <Link href="/" className="flex items-center">
      <Image src="/logo.png" alt="Logo" width={40} height={40} priority />
    </Link>

    {/* Navigation and Authentication Section */}
    <div className="flex items-center space-x-6">
      {/* Navigation Links */}
      <nav className="flex space-x-6">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-lg ${
              link.isActive ? "bg-[#7F56D9] text-white" : "text-gray-300 hover:text-white"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      {/* Authentication Section */}
      {isMounted ? (
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <span className="text-gray-300">Hello, {session?.user?.name}</span>
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <button
                onClick={() => signOut()}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center border border-gray-500 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <GoogleIcon />
              <span className="ml-2">Sign in with Google</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <div className="w-28 h-10 bg-gray-800 animate-pulse rounded-lg"></div>
        </div>
      )}
    </div>
  </header>

  );
};

// Google SVG Icon Component
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M24 9.5C27.5886 9.5 30.8713 10.8513 33.3737 13.1828L39.3215 7.49722C35.0731 3.59784 29.8506 1 24 1C14.6691 1 6.85574 6.53809 3.2043 14.4342L10.2858 19.9543C12.0904 14.8539 17.4542 9.5 24 9.5Z"
    />
    <path
      fill="#34A853"
      d="M46.1453 24.6192C46.1453 23.1244 46.0049 21.6829 45.7542 20.2954H24V28.1556H36.3214C35.7435 31.1169 34.0485 33.6511 31.6886 35.4673L38.3895 40.7293C43.0537 36.4504 46.1453 31.0848 46.1453 24.6192Z"
    />
    <path
      fill="#FBBC05"
      d="M10.2858 28.0457C9.37554 25.9828 8.89265 23.6757 8.89265 21.2618C8.89265 18.8479 9.37554 16.5408 10.2858 14.4779L3.2043 8.95783C1.16248 12.6776 0 16.8111 0 21.2618C0 25.7125 1.16248 29.846 3.2043 33.5658L10.2858 28.0457Z"
    />
    <path
      fill="#EA4335"
      d="M24 43C29.8506 43 35.0731 40.4022 39.3215 36.5028L32.6886 31.3664C30.2718 33.0202 27.3188 34.097 24 34.097C17.4542 34.097 12.0904 28.8539 10.2858 23.7536L3.2043 29.2736C6.85574 37.4619 14.6691 43 24 43Z"
    />
  </svg>
);

export default Header;

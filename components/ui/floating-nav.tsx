"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/ui/toggle"

export function FloatingNav() {
  return (
    <nav className="fixed top-4 left-0 right-0 w-full z-50">
      <div className="mx-auto w-fit max-w-md">
        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-800/20">
          <div className="flex items-center justify-between p-2">
            <div className="flex space-x-4 justify-between w-full">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium text-pink-900 dark:text-pink-100 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="px-3 py-2 rounded-md text-sm font-medium text-pink-900 dark:text-pink-100 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors"
              >
                About
              </Link>
              <Link
                href="https://www.linkedin.com/in/thaqifrosdi/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-md text-sm font-medium text-pink-900 dark:text-pink-100 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors"
              >
                Contact Me
              </Link>
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
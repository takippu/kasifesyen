"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className="relative w-12 h-6 rounded-full p-0 border-pink-200 dark:border-purple-700 hover:bg-pink-50 dark:hover:bg-purple-900/20"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Sun
          className={`h-[1rem] w-[1rem] transition-all duration-300 ${
            theme === "light" ? "opacity-100" : "opacity-0"
          }`}
        />
        <Moon
          className={`h-[1rem] w-[1rem] absolute transition-all duration-300 ${
            theme === "dark" ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
      <div
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-pink-500 dark:bg-purple-500 rounded-full shadow-md transition-transform duration-300 ease-in-out ${
          theme === "dark" ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </Button>
  )
}
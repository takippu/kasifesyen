"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const isDarkMode = theme === "dark"

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className={`relative w-14 h-7 rounded-full p-0 transition-colors duration-300 ${
        isDarkMode 
          ? "border-purple-700 bg-purple-900/10 hover:bg-purple-900/20" 
          : "border-pink-200 bg-pink-50 hover:bg-pink-100"
      }`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {/* Background Icons */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-between px-1"
        initial={false}
        animate={{ 
          rotate: isDarkMode ? 180 : 0,
          scale: isDarkMode ? 0.8 : 1 
        }}
        transition={{ duration: 0.4 }}
      >
        <Sun
          className={`h-4 w-4 ${
            !isDarkMode 
              ? "text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" 
              : "text-gray-400"
          }`}
        />
        <Moon
          className={`h-4 w-4 ${
            isDarkMode 
              ? "text-blue-300 drop-shadow-[0_0_4px_rgba(96,165,250,0.6)]" 
              : "text-gray-400"
          }`}
        />
      </motion.div>

      {/* Toggle Slider */}
      <motion.div
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md transition-colors duration-300 ${
          isDarkMode 
            ? "bg-purple-600 hover:bg-purple-500" 
            : "bg-pink-500 hover:bg-pink-400"
        }`}
        initial={false}
        animate={{ 
          x: isDarkMode ? 28 : 0,
          scale: [1, 1.2, 1],
          rotate: isDarkMode ? 360 : 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20,
          scale: { duration: 0.2 }
        }}
      />
    </Button>
  )
}
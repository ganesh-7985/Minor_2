"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Shield } from "lucide-react"
import Link from "next/link"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/80 backdrop-blur-md shadow-md py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-xl">CCTV Optimizer</span>
        </div>

        {/* Desktop Navigation */}
        {/* <nav className="hidden md:flex items-center gap-6">
          <Link href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">
            Home
          </Link>
          <Link href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">
            Features
          </Link>
          <Link href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">
            Documentation
          </Link>
          <Link href="#" className="text-sm font-medium hover:text-blue-400 transition-colors">
            Pricing
          </Link>
        </nav> */}

        <div className="flex items-center gap-4">
          <Button className="hidden md:flex bg-blue-600 hover:bg-blue-700">Get Started</Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-blue-900/30 shadow-lg animate-in slide-in-from-top-5">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link href="#" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md transition-colors">
              Home
            </Link>
            <Link href="#" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md transition-colors">
              Features
            </Link>
            <Link href="#" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md transition-colors">
              Documentation
            </Link>
            <Link href="#" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md transition-colors">
              Pricing
            </Link>
            <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  )
}


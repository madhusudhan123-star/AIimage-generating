"use client"

import Link from 'next/link';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Image as ImageIcon, Palette, ArrowRight, Star } from "lucide-react";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Powered by AI • Free to Use
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight">
              AI Image
              <br />
              <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                Generator
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-light">
              Transform your ideas into stunning visuals in seconds. No design skills needed.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-6 rounded-xl shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105">
              <Link href="/register" className="flex items-center">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 backdrop-blur-sm text-lg px-8 py-6 rounded-xl transition-all duration-300 hover:scale-105">
              <Link href="/login">
                Login
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">∞</div>
              <div className="text-white/80 text-sm">Unlimited Generations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">10s</div>
              <div className="text-white/80 text-sm">Average Speed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">100%</div>
              <div className="text-white/80 text-sm">Free Forever</div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Lightning Fast</h3>
            <p className="text-white/80 text-sm">Generate high-quality images in seconds with our optimized AI models</p>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Enhanced</h3>
            <p className="text-white/80 text-sm">Smart prompt enhancement for professional-quality results every time</p>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">High Resolution</h3>
            <p className="text-white/80 text-sm">Download crisp 1024x1024 images perfect for any project</p>
          </Card>
        </div>

        {/* Social Proof */}
        <div className="mt-16 flex items-center gap-2 text-white/90 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1200">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            ))}
          </div>
          <span className="text-sm font-medium">Join thousands creating amazing images</span>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-white/60 text-sm">
            No credit card required • Start creating in seconds
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .delay-700 {
          animation-delay: 700ms;
        }
        .delay-1000 {
          animation-delay: 1000ms;
        }
        .delay-200 {
          animation-delay: 200ms;
        }
        .delay-500 {
          animation-delay: 500ms;
        }
        .delay-1200 {
          animation-delay: 1200ms;
        }
      `}</style>
    </div>
  );
}

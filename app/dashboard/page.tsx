"use client"

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { api } from '@/app/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Download, LogOut, Sparkles, Clock, ImageIcon, Loader2, Zap, Grid3x3, List, Copy, Check, Sun, Moon, Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";

interface Generation {
  _id: string;
  prompt: string;
  enhancedPrompt: string;
  imageUrl: string;
  createdAt: string;
}

interface QueueItem {
  id: number;
  prompt: string;
  status: 'queued' | 'generating' | 'finalizing' | 'failed' | 'complete';
}

export default function DashboardPage() {
  const [prompt, setPrompt] = useState('');
  const [generationsQueue, setGenerationsQueue] = useState<QueueItem[]>([]);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [history, setHistory] = useState<Generation[]>([]);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { token, logout, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    loadHistory();
  }, [isAuthenticated, authLoading, router]);

  const loadHistory = async () => {
    if (!token) return;
    try {
      const data = await api.getHistory(token);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const checkImageLoaded = useCallback(async (url: string, updateStatus: (status: string) => void): Promise<boolean> => {
    return new Promise((resolve) => {
      let retries = 0;
      const maxRetries = 40;

      const pollImage = () => {
        const img = new Image();
        
        img.onload = () => {
          if (img.naturalWidth >= 1000 && img.naturalHeight >= 1000) {
            console.log('✅ IMAGE READY:', img.naturalWidth, 'x', img.naturalHeight);
            updateStatus('Image ready! ✨');
            resolve(true);
          } else {
            retries++;
            if (retries >= maxRetries) {
              console.log('⏰ Max retries reached, showing partial image');
              updateStatus('Showing available image...');
              resolve(true);
            } else {
              updateStatus(`Rendering... (${Math.round(retries * 3)}s)`);
              setTimeout(pollImage, 3000);
            }
          }
        };
        
        img.onerror = () => {
          retries++;
          if (retries >= maxRetries) {
            updateStatus('Failed to generate image');
            resolve(false);
          } else {
            setTimeout(pollImage, 3000);
          }
        };
        
        img.src = `${url}?t=${Date.now()}`;
      };
      
      pollImage();
    });
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !prompt.trim()) return;

    const newGen: QueueItem = { 
      id: Date.now(), 
      prompt: prompt.trim(), 
      status: 'queued' 
    };
    
    setGenerationsQueue(prev => [...prev, newGen]);
    setPrompt('');

    generateInBackground(newGen.id, newGen.prompt);

    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  const generateInBackground = async (genId: number, prompt: string) => {
    try {
      setIsGenerating(true);
      setLoadingProgress(0);
      setGenerationsQueue(prev => 
        prev.map(g => g.id === genId ? { ...g, status: 'generating' } : g)
      );
      setLoadingStatus('Enhancing prompt with AI...');
      setLoadingProgress(20);

      const data = await api.generateImage(prompt, token);
      setLoadingStatus('🎨 Image generation in progress...');
      setLoadingProgress(50);

      setGenerationsQueue(prev => 
        prev.map(g => g.id === genId ? { ...g, status: 'finalizing' } : g)
      );

      await checkImageLoaded(data.imageUrl, (status) => {
        setLoadingStatus(status);
        setLoadingProgress(75);
      });

      setGeneratedImage(data);
      setLoadingStatus('✨ Complete!');
      setLoadingProgress(100);
      loadHistory();
      
      setGenerationsQueue(prev => 
        prev.map(g => g.id === genId ? { ...g, status: 'complete' } : g)
      );
      
      setTimeout(() => {
        setGenerationsQueue(prev => prev.filter(g => g.id !== genId));
        setLoadingStatus('');
        setIsGenerating(false);
        setLoadingProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationsQueue(prev => 
        prev.map(g => g.id === genId ? { ...g, status: 'failed' } : g)
      );
      setLoadingStatus('❌ Generation failed');
      
      setTimeout(() => {
        setGenerationsQueue(prev => prev.filter(g => g.status !== 'failed' && g.id !== genId));
        setLoadingStatus('');
        setIsGenerating(false);
        setLoadingProgress(0);
      }, 5000);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/octet-stream',
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
      console.error('Download failed:', err);
      // Fallback to simple download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const examplePrompts = [
    "A futuristic cyberpunk city at night with neon lights",
    "Majestic dragon flying over snowy mountains",
    "Underwater coral reef with tropical fish",
    "Steampunk robot in Victorian London"
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50"}>
      {/* Header */}
      <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-2xl shadow-lg transition-colors duration-300 ${
        isDarkMode 
          ? "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-700/50" 
          : "bg-gradient-to-r from-slate-50 via-white to-slate-50 border-slate-200"
      }`}>
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className={`absolute inset-0 rounded-xl blur-lg opacity-70 animate-pulse transition-all duration-300 ${
                isDarkMode
                  ? "bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600"
                  : "bg-gradient-to-br from-blue-400 via-cyan-400 to-purple-500"
              }`}></div>
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl shadow-xl transition-all duration-300 ${
                isDarkMode
                  ? "bg-gradient-to-br from-cyan-400 to-blue-600"
                  : "bg-gradient-to-br from-blue-600 to-cyan-500"
              }`}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className={`text-2xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? "from-cyan-400 via-blue-400 to-purple-400"
                  : "from-blue-600 via-cyan-500 to-purple-600"
              } bg-clip-text text-transparent`}>
                AI Image Studio
              </h1>
              <p className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Transform Your Imagination</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge className={`hidden sm:flex gap-1 font-semibold px-3 py-1 ${
              isDarkMode 
                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                : "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-300"
            }`}>
              <Zap className="h-3 w-3" />
              {history.length} Created
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`transition-colors duration-200 ${isDarkMode ? "text-slate-300 hover:bg-slate-800 hover:text-cyan-400" : "text-slate-700 hover:bg-slate-100 hover:text-blue-600"}`}
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              onClick={logout} 
              className={`gap-2 font-semibold transition-all duration-200 ${
                isDarkMode 
                  ? "bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:text-cyan-400 hover:border-slate-500" 
                  : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 hover:border-blue-400"
              }`}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className={`container py-8 space-y-8 px-4 transition-colors duration-300 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Card className={`border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
            isDarkMode
              ? "bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600"
              : "bg-gradient-to-br from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100"
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Total Generated</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${isDarkMode ? "from-cyan-400 to-blue-400" : "from-blue-600 to-cyan-500"} bg-clip-text text-transparent`}>{history.length}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center border transition-all ${
                  isDarkMode
                    ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                    : "bg-blue-100 border-blue-300 text-blue-600"
                }`}>
                  <ImageIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
            isDarkMode
              ? "bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600"
              : "bg-gradient-to-br from-purple-50 to-slate-50 hover:from-purple-100 hover:to-slate-100"
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>This Month</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${isDarkMode ? "from-purple-400 to-pink-400" : "from-purple-600 to-pink-500"} bg-clip-text text-transparent`}>
                    {history.filter(h => new Date(h.createdAt).getMonth() === new Date().getMonth()).length}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center border transition-all ${
                  isDarkMode
                    ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
                    : "bg-purple-100 border-purple-300 text-purple-600"
                }`}>
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
            isDarkMode
              ? "bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600"
              : "bg-gradient-to-br from-pink-50 to-slate-50 hover:from-pink-100 hover:to-slate-100"
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Latest</p>
                  <p className={`text-sm font-bold truncate max-w-[140px] bg-gradient-to-r ${isDarkMode ? "from-pink-400 to-rose-400" : "from-pink-600 to-rose-500"} bg-clip-text text-transparent`}>
                    {history.length > 0 ? new Date(history[0].createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center border transition-all ${
                  isDarkMode
                    ? "bg-pink-500/20 border-pink-500/30 text-pink-400"
                    : "bg-pink-100 border-pink-300 text-pink-600"
                }`}>
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className={`border-0 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200 overflow-hidden ${
          isDarkMode 
            ? "bg-gradient-to-br from-slate-800 to-slate-700" 
            : "bg-gradient-to-br from-white to-slate-50 border border-slate-200"
        }`}>
           <CardHeader className={`space-y-3 pb-6 border-b ${isDarkMode ? "border-slate-600/50" : "border-slate-200/60"}`}>
             <div className="flex items-center justify-between flex-wrap gap-3">
               <CardTitle className={`flex items-center gap-3 text-2xl md:text-3xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                 <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                   isDarkMode
                     ? "bg-gradient-to-br from-cyan-400 to-blue-600"
                     : "bg-gradient-to-br from-blue-600 to-cyan-500"
                 }`}>
                   <Sparkles className="h-5 w-5 text-white" />
                 </div>
                 Create Your Image
               </CardTitle>
               {isGenerating && (
                <div className="flex items-center gap-2">
                  <Badge className={`gap-1.5 font-semibold px-3 py-1.5 text-sm ${
                    isDarkMode
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-500 text-white"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-400 text-white"
                  } animate-pulse`}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating... {loadingProgress}%</span>
                  </Badge>
                </div>
              )}
            </div>
            <CardDescription className={`text-base font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Describe your vision in detail for the best results
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Enhanced Loading Status with Animated Visualization */}
            {loadingStatus && (
              <div className={`relative p-5 border rounded-2xl space-y-4 animate-in slide-in-from-top-2 overflow-hidden group ${
                isDarkMode
                  ? "bg-gradient-to-br from-slate-700/60 via-blue-900/40 to-purple-900/40 border-blue-500/50"
                  : "bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 border-blue-300/70"
              }`}>
                {/* Animated background */}
                <div className={`absolute inset-0 ${isDarkMode ? "bg-gradient-to-r from-transparent via-blue-500/5 to-transparent" : "bg-gradient-to-r from-transparent via-blue-300/10 to-transparent"} animate-pulse opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                
                <div className="relative">
                  <div className={`flex items-center gap-3 text-sm font-semibold ${isDarkMode ? "text-cyan-300" : "text-blue-700"}`}>
                    <div className="relative flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-full ${isDarkMode ? "bg-cyan-500/30" : "bg-blue-400/40"} blur animate-pulse`}></div>
                      <Loader2 className="h-5 w-5 animate-spin relative" />
                    </div>
                    <span>{loadingStatus}</span>
                  </div>
                </div>
                
                {/* Advanced Progress Bar */}
                <div className="relative space-y-2">
                  <div className={`w-full h-3 ${isDarkMode ? "bg-slate-700/60" : "bg-slate-200/60"} rounded-full overflow-hidden backdrop-blur-sm border ${
                    isDarkMode ? "border-slate-600/40" : "border-slate-300/40"
                  } shadow-inner`}>
                    <div 
                      className={`h-full rounded-full shadow-xl transition-all duration-500 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 shadow-blue-500/50"
                          : "bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-600 shadow-blue-400/40"
                      }`}
                      style={{ width: `${loadingProgress}%` }}
                    >
                      <div className="h-full w-full rounded-full opacity-50 blur-sm animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${isDarkMode ? "text-cyan-300" : "text-blue-600"}`}>{loadingProgress}% complete</span>
                    <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {loadingProgress < 25 && "✨ Enhancing prompt..."}
                      {loadingProgress >= 25 && loadingProgress < 60 && "🎨 Generating artwork..."}
                      {loadingProgress >= 60 && loadingProgress < 85 && "⚡ Finalizing details..."}
                      {loadingProgress >= 85 && "🚀 Almost done!"}
                    </span>
                  </div>
                </div>
              </div>
            )}  
            {/* Form - Always visible */}
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="relative group">
                <Input
                  type="text"
                  placeholder={
                    isGenerating
                      ? `⏳ Generating... Please wait - Cannot create new images` 
                      : "Describe your image in detail..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  className={`text-base h-13 pr-14 border-2 transition-all duration-300 font-medium ${
                    isGenerating
                      ? isDarkMode 
                        ? "border-red-500/50 bg-slate-700/70 text-slate-400 placeholder-slate-500 cursor-not-allowed opacity-60"
                        : "border-red-400/50 bg-slate-100/70 text-slate-500 placeholder-slate-500 cursor-not-allowed opacity-60"
                      : isDarkMode
                        ? "border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 focus:bg-slate-600 focus:ring-2 focus:ring-cyan-500/20"
                        : "border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Badge className={`text-xs font-bold ${
                    isDarkMode 
                      ? "bg-slate-600 text-slate-100 border-slate-500" 
                      : "bg-slate-300 text-slate-900 border-slate-400"
                  }`}>
                    {prompt.length}/500
                  </Badge>
                </div>
              </div>

              {/* Example Prompts */}
              {prompt.length === 0 && !isGenerating && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>📌 Try these examples:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {examplePrompts.map((example, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isGenerating}
                        className={`text-xs h-8 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                          isDarkMode
                            ? "border-slate-600 text-slate-300 hover:bg-cyan-600/20 hover:text-cyan-300 hover:border-cyan-500"
                            : "border-slate-300 text-slate-700 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-400"
                        }`}
                        onClick={() => setPrompt(example)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isGenerating || !prompt.trim()}
                className={`w-full h-13 text-base font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  isGenerating
                    ? "bg-red-600/60 hover:bg-red-600/60 text-white opacity-60 scale-95 cursor-not-allowed shadow-lg shadow-red-500/20"
                    : "bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-600 hover:via-blue-700 hover:to-purple-700 hover:shadow-2xl hover:scale-[1.02] text-white shadow-lg shadow-blue-500/30"
                }`}
                size="lg"
              >
                <Sparkles className={`h-5 w-5 transition-all duration-300 ${isGenerating ? "animate-spin" : "animate-bounce"}`} />
                <span>{isGenerating ? `Generating... ${loadingProgress}%` : 'Generate Image'}</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gallery */}
        <Card className={`border-0 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 overflow-hidden ${
          isDarkMode 
            ? "bg-gradient-to-br from-slate-800 to-slate-700" 
            : "bg-gradient-to-br from-white to-slate-50 border border-slate-200"
        }`}>
          <CardHeader className={`border-b ${isDarkMode ? "border-slate-600/50" : "border-slate-200/50"} pb-4`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className={`flex items-center gap-3 text-2xl md:text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isDarkMode
                      ? "bg-gradient-to-br from-purple-500 to-pink-500"
                      : "bg-gradient-to-br from-purple-600 to-pink-500"
                  }`}>
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  Your Gallery
                </CardTitle>
                <CardDescription className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Browse and manage all your AI-generated creations
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-sm font-bold px-3 py-1.5 ${
                  isDarkMode 
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/30" 
                    : "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-300"
                }`}>
                  <span className="text-lg mr-1">📷</span>
                  {history.length} {history.length === 1 ? 'Image' : 'Images'}
                </Badge>
                <div className={`flex border rounded-lg transition-all ${
                  isDarkMode 
                    ? "border-slate-600 bg-slate-700/80 backdrop-blur" 
                    : "border-slate-300 bg-slate-100/80 backdrop-blur"
                }`}>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-r-none transition-all font-semibold ${
                      viewMode === 'grid'
                        ? isDarkMode
                          ? "bg-slate-600 text-cyan-300"
                          : "bg-slate-300 text-blue-700"
                        : isDarkMode
                          ? "bg-transparent text-slate-400 hover:text-slate-200"
                          : "bg-transparent text-slate-600 hover:text-slate-800"
                    }`}
                    title="Grid View"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`rounded-l-none transition-all font-semibold ${
                      viewMode === 'list'
                        ? isDarkMode
                          ? "bg-slate-600 text-cyan-300"
                          : "bg-slate-300 text-blue-700"
                        : isDarkMode
                          ? "bg-transparent text-slate-400 hover:text-slate-200"
                          : "bg-transparent text-slate-600 hover:text-slate-800"
                    }`}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-8">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="relative mb-2">
                  <div className={`absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse transition-all ${
                    isDarkMode
                      ? "bg-gradient-to-br from-cyan-500 to-purple-600"
                      : "bg-gradient-to-br from-blue-400 to-purple-500"
                  }`}></div>
                  <div className={`relative rounded-full p-8 border transition-all ${
                    isDarkMode
                      ? "bg-slate-700/50 border-slate-600"
                      : "bg-slate-100/50 border-slate-300"
                  }`}>
                    <ImageIcon className={`h-20 w-20 transition-all ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                  </div>
                </div>
                <h3 className={`text-2xl font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>No images yet</h3>
                <p className={`max-w-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Start creating beautiful AI-generated images using the form above!
                </p>
                <Button 
                  variant="outline"
                  onClick={() => document.querySelector('input[type="text"]')?.focus()}
                  className={`gap-2 mt-2 font-semibold transition-all duration-200 ${
                    isDarkMode
                      ? "border-slate-600 text-slate-300 hover:bg-cyan-600/20 hover:text-cyan-300 hover:border-cyan-500"
                      : "border-slate-300 text-slate-700 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-400"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Start Creating
                </Button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  : "space-y-4"
              }>
                {history.map((gen, index) => (
                  <Card 
                    key={gen._id}
                    className={`w-full shadow-none py-0 gap-0 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 border-0 cursor-pointer overflow-hidden ${
                      isDarkMode
                        ? "bg-gradient-to-br from-slate-700 to-slate-800"
                        : "bg-gradient-to-br from-white to-slate-50"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Card Header with User Info */}
                    <CardHeader className={`flex flex-row items-center justify-between py-2.5 -mr-1 border-b ${isDarkMode ? "border-slate-600/30" : "border-slate-200"}`}>
                      <Item className="w-full p-0 gap-2.5">
                        <ItemMedia>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            isDarkMode 
                              ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                              : "bg-gradient-to-br from-blue-500 to-cyan-600"
                          }`}>
                            {gen.prompt.charAt(0).toUpperCase()}
                          </div>
                        </ItemMedia>
                        <ItemContent className="gap-0">
                          <ItemTitle className="text-sm">AI Image</ItemTitle>
                          <ItemDescription className="text-xs">
                            {new Date(gen.createdAt).toLocaleDateString()}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className="-me-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className={`h-6 w-6 ${isDarkMode ? "hover:bg-slate-600/50" : "hover:bg-slate-200"}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </ItemActions>
                      </Item>
                    </CardHeader>

                    {/* Card Image */}
                    <CardContent className="p-0">
                      <div 
                        className={`relative aspect-video bg-muted border-y overflow-hidden group transition-all duration-300 ${isDarkMode ? "border-slate-600/30 bg-slate-800" : "border-slate-200 bg-slate-200"}`}
                      >
                        <img
                          src={gen.imageUrl}
                          alt={gen.prompt}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      
                      {/* Text Content */}
                      <div className={`py-4 px-4 ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
                        <h3 className={`font-semibold text-sm line-clamp-2 mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                          {gen.prompt.substring(0, 50)}...
                        </h3>
                        <p className={`text-xs line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {gen.prompt}
                        </p>
                      </div>
                    </CardContent>

                    {/* Card Footer with Actions */}
                    <CardFooter className={`border-t flex px-2 pb-0 py-2 gap-0 ${isDarkMode ? "border-slate-600/30" : "border-slate-200"}`}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(gen.imageUrl, `${gen.prompt.slice(0, 20)}.png`);
                        }}
                        className={`grow shrink-0 text-xs h-8 transition-all ${isDarkMode ? "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-600 hover:text-blue-600 hover:bg-blue-100"}`}
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs ml-1">Download</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(gen.imageUrl);
                        }}
                        className={`grow shrink-0 text-xs h-8 transition-all ${isDarkMode ? "text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-slate-600 hover:text-cyan-600 hover:bg-cyan-100"}`}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="hidden sm:inline text-xs ml-1">{copied ? 'Copied' : 'Copy'}</span>
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const text = `Check out this AI-generated image: ${gen.imageUrl}`;
                          navigator.share ? navigator.share({ text, url: gen.imageUrl }) : copyToClipboard(text);
                        }}
                        className={`grow shrink-0 text-xs h-8 transition-all ${isDarkMode ? "text-slate-400 hover:text-green-400 hover:bg-green-500/10" : "text-slate-600 hover:text-green-600 hover:bg-green-100"}`}
                      >
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs ml-1">Share</span>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Image Detail Dialog - Side by Side Layout */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)} >
        <DialogContent className={`border-0 shadow-2xl rounded-2xl w-[95vw] p-0 overflow-hidden ${
          isDarkMode
            ? "bg-gradient-to-br from-slate-800 to-slate-900"
            : "bg-white"
        }`} onOpenAutoFocus={(e) => e.preventDefault()}>
          {/* Desktop: Side by Side Layout */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-0 md:h-[90vh]">
            {/* Left Side - Image */}
            {selectedImage && (
              <>
                <div className={`relative overflow-hidden flex items-center justify-center border-r ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-700/50"
                    : "bg-slate-100 border-slate-300"
                }`}>
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.prompt}
                    className="w-full h-full transition-transform duration-500 hover:scale-105"
                  />
                </div>

                {/* Right Side - Content */}
                <div className={`p-8 overflow-y-auto flex flex-col justify-between ${
                  isDarkMode ? "bg-slate-800" : "bg-white"
                }`} style={{ scrollBehavior: 'smooth' }}>
                  {/* Header */}
                  <div className="space-y-4 pb-6 border-b border-slate-600/30">
                    <div>
                      <h2 className={`text-2xl font-bold flex items-center gap-2 mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shadow-lg ${
                          isDarkMode
                            ? "bg-gradient-to-br from-cyan-400 to-blue-600"
                            : "bg-gradient-to-br from-blue-600 to-cyan-500"
                        }`}>
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        Image Details
                      </h2>
                      <p className={`text-xs font-medium flex items-center gap-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        📅 {new Date(selectedImage.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Prompts */}
                  <div className="space-y-4 flex-1 py-6">
                    <div className="space-y-2">
                      <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? "text-cyan-300" : "text-blue-700"}`}>
                        <Sparkles className="h-4 w-4" />
                        Original Prompt
                      </p>
                      <p className={`text-sm leading-relaxed p-3 rounded-lg ${
                        isDarkMode
                          ? "bg-slate-700/50 text-slate-200"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {selectedImage.prompt}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>
                        <Zap className="h-4 w-4" />
                        AI Enhanced Prompt
                      </p>
                      <p className={`text-sm leading-relaxed p-3 rounded-lg max-h-32 overflow-y-auto ${
                        isDarkMode
                          ? "bg-slate-700/50 text-slate-200"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {selectedImage.enhancedPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-slate-600/30">
                    <Button
                      onClick={() => downloadImage(selectedImage.imageUrl, `${selectedImage.prompt.slice(0, 20)}.png`)}
                      className={`flex-1 font-semibold h-11 gap-2 rounded-lg transition-all duration-300 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl"
                          : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl"
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(selectedImage.imageUrl)}
                      className={`flex-1 font-semibold h-11 gap-2 rounded-lg transition-all duration-300 ${
                        isDarkMode
                          ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:border-cyan-500 hover:text-cyan-300"
                          : "border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200 hover:border-blue-400"
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Copy URL
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile: Image Full Width with Only Buttons */}
          <div className="md:hidden flex flex-col h-[95vh] overflow-hidden">
            {selectedImage && (
              <>
                {/* Full Width Image */}
                <div className={`relative flex-1 overflow-hidden ${
                  isDarkMode
                    ? "bg-slate-900"
                    : "bg-slate-100"
                }`}>
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.prompt}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Buttons Only */}
                <div className={`p-4 border-t flex gap-3 ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-700/50"
                    : "bg-white border-slate-300"
                }`}>
                  <Button
                    onClick={() => downloadImage(selectedImage.imageUrl, `${selectedImage.prompt.slice(0, 20)}.png`)}
                    className={`flex-1 font-semibold h-11 gap-2 rounded-lg transition-all duration-300 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                        : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(selectedImage.imageUrl)}
                    className={`flex-1 font-semibold h-11 gap-2 rounded-lg transition-all duration-300 ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:border-cyan-500 hover:text-cyan-300"
                        : "border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200 hover:border-blue-400"
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prevent background scroll when dialog is open */}
      {selectedImage && (
        <style>{`body { overflow: hidden; }`}</style>
      )}
    </div>
  );
}
'use client';

import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Download, Music, AlertCircle, CheckCircle2, Zap, Loader2 } from 'lucide-react';

// --- 1. UTILITY COMPONENT: MAGNETIC BUTTON ---
const MagneticButton = ({ children, onClick, className, disabled }: any) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useGSAP(() => {
    const button = buttonRef.current;
    if (!button) return;

    const xTo = gsap.quickTo(button, "x", { duration: 1, ease: "elastic.out(1, 0.3)" });
    const yTo = gsap.quickTo(button, "y", { duration: 1, ease: "elastic.out(1, 0.3)" });

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = button.getBoundingClientRect();
      const x = clientX - (left + width / 2);
      const y = clientY - (top + height / 2);
      xTo(x * 0.5);
      yTo(y * 0.5);
    };

    const handleMouseLeave = () => {
      xTo(0);
      yTo(0);
    };

    button.addEventListener("mousemove", handleMouseMove);
    button.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      button.removeEventListener("mousemove", handleMouseMove);
      button.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, { scope: buttonRef });

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold transition-all ${className}`}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

// --- 2. MAIN APPLICATION COMPONENT ---

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'downloading' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  // --- ANIMATION: INITIAL LOAD ---
  useGSAP(() => {
    const tl = gsap.timeline();

    tl.set(containerRef.current, { visibility: 'visible' })
      .from('.bg-gradient', { 
        opacity: 0, 
        duration: 2, 
        ease: 'power2.inOut' 
      })
      .from(cardRef.current, {
        y: 100,
        opacity: 0,
        rotationX: 45,
        duration: 1.5,
        ease: 'expo.out'
      }, '-=1.5')
      .from('.stagger-item', {
        y: 20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'back.out(1.7)'
      }, '-=1');

    gsap.to(cardRef.current, {
      y: '-=15',
      rotation: 0.5,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: containerRef });

  // --- LOGIC: HANDLE DOWNLOAD (DIRECT LINK METHOD) ---
  const handleDownload = async () => {
    if (!url) {
      const input = document.querySelector('.url-input') as HTMLElement;
      gsap.to(input, { x: 10, duration: 0.1, yoyo: true, repeat: 5 });
      return;
    }

    setStatus('processing');
    setProgress(10);

    // Visual timer to show "Working..." while the server starts up
    const progressAnim = gsap.to({}, {
      duration: 3, 
      onUpdate: function() {
        if (status === 'processing') {
          // Cap visual progress at 90% until the file actually hits
          const val = Math.round(this.progress() * 90);
          setProgress(val);
        }
      }
    });

    try {
      // 1. Construct the Direct Download Link
      const downloadLink = `/api/download?url=${encodeURIComponent(url)}`;
      
      // 2. Trigger the download after a short delay (for animation)
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = downloadLink;
        document.body.appendChild(link);
        
        // This forces the browser to take over the download
        link.click();
        
        // Cleanup
        link.remove();
        
        // 3. Update UI to success
        progressAnim.kill();
        setProgress(100);
        setStatus('complete');
        
        // Success Pop Animation
        gsap.fromTo(cardRef.current, 
          { scale: 1 },
          { scale: 1.02, duration: 0.2, yoyo: true, repeat: 1 }
        );
      }, 1500);

    } catch (error) {
      console.error(error);
      progressAnim.kill();
      setStatus('error');
      gsap.to(cardRef.current, { x: 10, duration: 0.1, yoyo: true, repeat: 5 });
    }
  };

  return (
    <main 
      ref={containerRef} 
      className="min-h-screen w-full flex items-center justify-center bg-black overflow-hidden relative invisible"
    >
      {/* 1. Dynamic Background */}
      <div className="bg-gradient absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      {/* 2. Main Interface Card */}
      <div 
        ref={cardRef}
        className="relative z-10 w-full max-w-xl mx-4 p-1 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
        style={{ perspective: '1000px' }}
      >
        <div className="bg-black/40 rounded-[22px] p-8 md:p-12 border border-white/5 flex flex-col gap-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="stagger-item flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-widest border border-blue-500/30">
                v1.0.0
              </span>
            </div>
            <h1 className="stagger-item text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white/50 tracking-widest uppercase">
              PRESENCE
            </h1>
            <p className="stagger-item text-white/50 text-sm font-medium">
              High-Fidelity Audio Gateway
            </p>
          </div>

          {/* Input Section */}
          <div className="stagger-item space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-75 transition duration-500 blur-sm" />
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube Link Here..."
                className="url-input relative w-full bg-black/80 text-white placeholder:text-white/20 px-6 py-5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                <Zap size={18} />
              </div>
            </div>
          </div>

          {/* Status Display Area */}
          <div className="stagger-item h-24 flex items-center justify-center flex-col w-full">
            
            {status === 'idle' && (
              <div className="text-center text-white/30 text-sm animate-pulse">
                Ready for input stream...
              </div>
            )}

            {(status === 'processing' || status === 'downloading') && (
              <div className="w-full space-y-3">
                <div className="flex justify-between text-xs font-mono text-blue-400">
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={12}/> 
                    {status === 'processing' ? 'CONVERTING_STREAM' : 'SAVING_TO_DISK'}
                  </span>
                  <span>{progress}%</span>
                </div>
                {/* Progress Bar Container */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="progress-bar h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 relative transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_1s_infinite]" />
                  </div>
                </div>
              </div>
            )}

            {status === 'complete' && (
              <div className="flex flex-col items-center gap-2 text-green-400 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={32} />
                <span className="font-bold tracking-wide">DOWNLOAD STARTED</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-2 text-red-400 animate-in fade-in zoom-in duration-300">
                <AlertCircle size={32} />
                <span className="font-bold tracking-wide">CONNECTION ERROR</span>
                <span className="text-xs text-red-400/50">Check URL or Video Age Restriction</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="stagger-item flex justify-center pt-4">
            {status === 'complete' ? (
              <MagneticButton 
                className="bg-green-500 text-black hover:bg-green-400 shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)]"
                onClick={() => {
                  setStatus('idle');
                  setUrl('');
                  setProgress(0);
                }}
              >
                <Music size={18} /> Convert Another
              </MagneticButton>
            ) : (
              <MagneticButton 
                className={`bg-white text-black hover:bg-blue-50 transition-all ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleDownload}
                disabled={status !== 'idle'}
              >
                <Download size={18} /> 
                {status === 'idle' ? 'Extract Audio' : 'Processing...'}
              </MagneticButton>
            )}
          </div>
          
          <div className="stagger-item text-center">
             <p className="text-[10px] text-white/20">
               *Strictly for use with non-copyrighted or personal content.
             </p>
          </div>

        </div>
      </div>
    </main>
  );
}
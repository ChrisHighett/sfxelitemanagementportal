import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">App Installed!</h2>
            <p className="text-sm text-muted-foreground">TGI Pathways is installed on your device. You can access it from your home screen.</p>
            <Button onClick={() => window.location.href = "/portal"} className="w-full h-12">
              Open Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto">
            <img src="/pwa-icon-192.png" alt="TGI Pathways" className="w-20 h-20 rounded-2xl shadow-lg" />
          </div>
          <CardTitle className="text-xl">Install TGI Pathways</CardTitle>
          <p className="text-sm text-muted-foreground">
            Get the full app experience — fast access, offline support, and no browser UI.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full h-12 text-base gap-2">
              <Download className="h-5 w-5" /> Install App
            </Button>
          ) : isIOS ? (
            <div className="space-y-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Smartphone className="h-3 w-3" /> iOS
              </Badge>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">1.</span>
                  Tap the <strong>Share</strong> button in Safari (square with arrow)
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">2.</span>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">3.</span>
                  Tap <strong>"Add"</strong> to confirm
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Open this page in Chrome or Edge and the install option will appear automatically.</p>
              <p>Or use your browser menu → <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</p>
            </div>
          )}

          <div className="pt-2 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">✓ Works offline</div>
            <div className="flex items-center gap-2">✓ Full-screen experience</div>
            <div className="flex items-center gap-2">✓ Fast load times</div>
            <div className="flex items-center gap-2">✓ Secure & authenticated</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

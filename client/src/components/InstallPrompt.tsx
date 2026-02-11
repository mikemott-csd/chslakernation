import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('lakers-install-dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    if ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone === true) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOS(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    setDismissed(true);
    localStorage.setItem('lakers-install-dismissed', Date.now().toString());
  };

  if (dismissed || (!showAndroid && !showIOS)) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto" data-testid="install-prompt">
      <Card className="border-2 border-[hsl(210,85%,35%)]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-md bg-[hsl(210,85%,35%)] flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" data-testid="text-install-title">
                Install Lakers Athletics
              </p>
              {showAndroid && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add to your home screen for the best experience with push notifications.
                  </p>
                  <Button
                    className="mt-3 w-full"
                    onClick={handleInstall}
                    data-testid="button-install-app"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                  </Button>
                </>
              )}
              {showIOS && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    To install: tap the <Share className="inline h-3 w-3 mx-0.5" /> Share button in Safari, then select "Add to Home Screen".
                  </p>
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">1.</span>
                      <span>Tap <Share className="inline h-3 w-3" /> Share at the bottom</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="font-medium">2.</span>
                      <span>Scroll down and tap "Add to Home Screen"</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="font-medium">3.</span>
                      <span>Tap "Add" to confirm</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={handleDismiss}
              data-testid="button-dismiss-install"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

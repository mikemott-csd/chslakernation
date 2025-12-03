import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/Champ_(1)_(1)_1764791051222.png";
import { Check, X, Loader2, Home as HomeIcon, Calendar, Bell } from "lucide-react";
import { Link } from "wouter";

export default function Unsubscribe() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unsubToken = params.get("token");
    if (!unsubToken) {
      toast({
        title: "Error",
        description: "Invalid unsubscribe link",
        variant: "destructive",
      });
    } else {
      setToken(unsubToken);
    }
  }, [toast]);

  const unsubscribeMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest("/api/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Unsubscribed",
        description: "You've been unsubscribed from all Lakers game notifications.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unsubscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUnsubscribe = () => {
    if (token) {
      unsubscribeMutation.mutate(token);
    }
  };

  const isSuccess = unsubscribeMutation.isSuccess;
  const isError = unsubscribeMutation.isError;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      <header className="h-16 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between px-3 md:px-8 shadow-md">
        <div className="flex items-center gap-2 md:gap-4">
          <img src={logoUrl} alt="CHS Lakers" className="h-10 md:h-16 rounded" data-testid="img-logo" />
          <h1 className="text-white text-base md:text-2xl font-bold hidden sm:block" data-testid="text-header">
            Colchester Lakers Athletics
          </h1>
          <h1 className="text-white text-base font-bold sm:hidden" data-testid="text-header-mobile">
            Lakers
          </h1>
        </div>
        <nav className="flex gap-1 md:gap-4 items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 md:hidden" data-testid="link-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/20 hidden md:flex" data-testid="link-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 md:hidden" data-testid="link-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/20 hidden md:flex" data-testid="link-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 md:hidden" data-testid="button-get-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white/20 hidden md:flex" data-testid="button-get-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            {isSuccess && (
              <>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-green-600" data-testid="icon-success" />
                </div>
                <CardTitle className="text-2xl">You've been unsubscribed</CardTitle>
                <CardDescription className="text-base mt-2">
                  You will no longer receive Lakers game notifications.
                </CardDescription>
              </>
            )}
            {isError && (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="w-10 h-10 text-red-600" data-testid="icon-error" />
                </div>
                <CardTitle className="text-2xl">Unsubscribe failed</CardTitle>
                <CardDescription className="text-base mt-2">
                  The unsubscribe link may be invalid or expired.
                </CardDescription>
              </>
            )}
            {!isSuccess && !isError && token && (
              <>
                <CardTitle className="text-2xl">Unsubscribe from notifications?</CardTitle>
                <CardDescription className="text-base mt-2">
                  You'll no longer receive email notifications for Lakers games.
                </CardDescription>
              </>
            )}
            {!token && (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="w-10 h-10 text-red-600" data-testid="icon-error" />
                </div>
                <CardTitle className="text-2xl">Invalid Link</CardTitle>
                <CardDescription className="text-base mt-2">
                  This unsubscribe link is not valid.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isSuccess && (
                <>
                  <Link href="/">
                    <Button className="w-full" data-testid="button-back-home">
                      Back to Schedule
                    </Button>
                  </Link>
                  <Link href="/subscribe">
                    <Button variant="outline" className="w-full" data-testid="button-subscribe-again">
                      Subscribe Again
                    </Button>
                  </Link>
                </>
              )}
              {!isSuccess && !isError && token && (
                <>
                  <Button
                    onClick={handleUnsubscribe}
                    disabled={unsubscribeMutation.isPending}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-confirm-unsubscribe"
                  >
                    {unsubscribeMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {unsubscribeMutation.isPending ? "Unsubscribing..." : "Yes, Unsubscribe"}
                  </Button>
                  <Link href="/">
                    <Button variant="outline" className="w-full" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                </>
              )}
              {(isError || !token) && (
                <Link href="/">
                  <Button className="w-full" data-testid="button-back-home">
                    Back to Schedule
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

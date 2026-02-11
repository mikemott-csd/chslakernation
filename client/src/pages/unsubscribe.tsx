import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/CHSLakerNation_1770824041645.png";
import { Check, X, Loader2, Home as HomeIcon, Calendar, Bell } from "lucide-react";
import { Link } from "wouter";

export default function Unsubscribe() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [unsubscribeAll, setUnsubscribeAll] = useState(false);
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

  const subscriptionQuery = useQuery<{ sports: string[] }>({
    queryKey: ["/api/subscription/by-token", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`/api/subscription/by-token/${token}`);
      if (!res.ok) throw new Error("Subscription not found");
      return res.json();
    },
  });

  const subscribedSports = subscriptionQuery.data?.sports || [];

  useEffect(() => {
    if (unsubscribeAll && subscribedSports.length > 0) {
      setSelectedSports([...subscribedSports]);
    } else if (!unsubscribeAll) {
      setSelectedSports([]);
    }
  }, [unsubscribeAll, subscribedSports]);

  const toggleSport = (sport: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sport)) {
        const newSelection = prev.filter(s => s !== sport);
        if (newSelection.length < subscribedSports.length) {
          setUnsubscribeAll(false);
        }
        return newSelection;
      } else {
        const newSelection = [...prev, sport];
        if (newSelection.length === subscribedSports.length) {
          setUnsubscribeAll(true);
        }
        return newSelection;
      }
    });
  };

  const unsubscribeMutation = useMutation({
    mutationFn: async ({ token, sports }: { token: string; sports?: string[] }) => {
      return await apiRequest("/api/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ token, sports }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Unsubscribed",
        description: data.message || "You've been unsubscribed from selected sports.",
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
      if (unsubscribeAll || selectedSports.length === subscribedSports.length) {
        unsubscribeMutation.mutate({ token });
      } else {
        unsubscribeMutation.mutate({ token, sports: selectedSports });
      }
    }
  };

  const isSuccess = unsubscribeMutation.isSuccess;
  const isError = unsubscribeMutation.isError;
  const mutationData = unsubscribeMutation.data as any;
  const fullyUnsubscribed = mutationData?.fullyUnsubscribed ?? true;
  const remainingSports = mutationData?.remainingSports || [];

  const canSubmit = selectedSports.length > 0 || unsubscribeAll;

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
        <nav className="flex gap-1 md:gap-3 items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="button-get-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/40 text-white hidden md:flex" data-testid="button-get-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            {subscriptionQuery.isLoading && token && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Loading subscription...</CardTitle>
              </>
            )}
            {subscriptionQuery.isError && token && (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="w-10 h-10 text-red-600" data-testid="icon-error" />
                </div>
                <CardTitle className="text-2xl">Subscription not found</CardTitle>
                <CardDescription className="text-base mt-2">
                  This unsubscribe link may be invalid or expired.
                </CardDescription>
              </>
            )}
            {isSuccess && (
              <>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-green-600" data-testid="icon-success" />
                </div>
                <CardTitle className="text-2xl">
                  {fullyUnsubscribed ? "You've been unsubscribed" : "Subscription updated"}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {fullyUnsubscribed 
                    ? "You will no longer receive Lakers game notifications."
                    : `You're still subscribed to: ${remainingSports.join(", ")}`
                  }
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
            {!isSuccess && !isError && !subscriptionQuery.isLoading && !subscriptionQuery.isError && token && (
              <>
                <CardTitle className="text-2xl">Manage your subscriptions</CardTitle>
                <CardDescription className="text-base mt-2">
                  Select which sports you'd like to unsubscribe from.
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
                      {fullyUnsubscribed ? "Subscribe Again" : "Manage Subscriptions"}
                    </Button>
                  </Link>
                </>
              )}
              {!isSuccess && !isError && !subscriptionQuery.isLoading && !subscriptionQuery.isError && token && subscribedSports.length > 0 && (
                <>
                  <div className="space-y-3 text-left border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center space-x-3 pb-3 border-b">
                      <Checkbox
                        id="unsubscribe-all"
                        checked={unsubscribeAll}
                        onCheckedChange={(checked) => setUnsubscribeAll(checked === true)}
                        data-testid="checkbox-unsubscribe-all"
                      />
                      <Label 
                        htmlFor="unsubscribe-all" 
                        className="font-semibold cursor-pointer"
                      >
                        Unsubscribe from all sports
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Or select specific sports:</p>
                    {subscribedSports.map((sport) => (
                      <div key={sport} className="flex items-center space-x-3">
                        <Checkbox
                          id={`sport-${sport}`}
                          checked={selectedSports.includes(sport)}
                          onCheckedChange={() => toggleSport(sport)}
                          data-testid={`checkbox-sport-${sport.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label 
                          htmlFor={`sport-${sport}`}
                          className="cursor-pointer"
                        >
                          {sport}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleUnsubscribe}
                    disabled={unsubscribeMutation.isPending || !canSubmit}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-confirm-unsubscribe"
                  >
                    {unsubscribeMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {unsubscribeMutation.isPending 
                      ? "Unsubscribing..." 
                      : unsubscribeAll || selectedSports.length === subscribedSports.length
                        ? "Unsubscribe from All"
                        : `Unsubscribe from ${selectedSports.length} sport${selectedSports.length !== 1 ? 's' : ''}`
                    }
                  </Button>
                  <Link href="/">
                    <Button variant="outline" className="w-full" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                </>
              )}
              {(isError || !token || subscriptionQuery.isError) && !isSuccess && (
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

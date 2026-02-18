import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/CHSLakerNation_1770824041645.png";
import { ArrowLeft, Check, Home as HomeIcon, Calendar, Bell, Image, Smartphone, BellRing } from "lucide-react";
import { isPushSupported, requestPushPermission } from "@/lib/firebase";

const SPORTS = ["Football", "Boys Basketball", "Girls Basketball", "Volleyball", "Boys Hockey", "Girls Ice Hockey"] as const;

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  sports: z.array(z.string()).min(1, "Please select at least one sport"),
});

type FormData = z.infer<typeof formSchema>;

export default function Subscribe() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSports, setPushSports] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setPushSupported(isPushSupported());
    const savedPush = localStorage.getItem('lakers-push-enabled');
    const savedSports = localStorage.getItem('lakers-push-sports');
    if (savedPush === 'true') setPushEnabled(true);
    if (savedSports) {
      try { setPushSports(JSON.parse(savedSports)); } catch {}
    }
  }, []);

  const handleEnablePush = async (selectedSports: string[]) => {
    if (selectedSports.length === 0) {
      toast({ title: "Select at least one sport", description: "Choose which sports you want push notifications for.", variant: "destructive" });
      return;
    }
    setPushLoading(true);
    try {
      const token = await requestPushPermission();
      if (!token) {
        toast({ title: "Permission denied", description: "Please allow notifications in your browser settings to receive push alerts.", variant: "destructive" });
        setPushLoading(false);
        return;
      }
      await apiRequest("/api/push-subscriptions", {
        method: "POST",
        body: JSON.stringify({ fcmToken: token, sports: selectedSports }),
        headers: { "Content-Type": "application/json" },
      });
      setPushEnabled(true);
      setPushSports(selectedSports);
      localStorage.setItem('lakers-push-token', token);
      localStorage.setItem('lakers-push-enabled', 'true');
      localStorage.setItem('lakers-push-sports', JSON.stringify(selectedSports));
      toast({ title: "Push notifications enabled!", description: "You'll receive alerts on this device for upcoming games." });
    } catch (error) {
      toast({ title: "Failed to enable push", description: "Please try again later.", variant: "destructive" });
    }
    setPushLoading(false);
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    try {
      const savedToken = localStorage.getItem('lakers-push-token');
      if (savedToken) {
        await apiRequest("/api/push-subscriptions", {
          method: "DELETE",
          body: JSON.stringify({ fcmToken: savedToken }),
          headers: { "Content-Type": "application/json" },
        });
      }
      setPushEnabled(false);
      setPushSports([]);
      localStorage.removeItem('lakers-push-enabled');
      localStorage.removeItem('lakers-push-token');
      localStorage.removeItem('lakers-push-sports');
      toast({ title: "Push notifications disabled", description: "You will no longer receive push alerts on this device." });
    } catch {
      setPushEnabled(false);
      localStorage.removeItem('lakers-push-enabled');
      localStorage.removeItem('lakers-push-token');
      localStorage.removeItem('lakers-push-sports');
    }
    setPushLoading(false);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      sports: [],
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("/api/subscriptions", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data: any) => {
      setIsSuccess(true);
      toast({
        title: "Success!",
        description: data.message || "You're subscribed to Lakers game notifications!",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    subscribeMutation.mutate(data);
  };

  if (isSuccess) {
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
            <Link href="/gallery">
              <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-gallery-mobile">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-gallery">
                Gallery
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
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-600" data-testid="icon-success" />
              </div>
              <CardTitle className="text-2xl">You're all set!</CardTitle>
              <CardDescription className="text-base mt-2">
                Check your email for a confirmation message. You'll receive notifications 24 hours before each game and on game day morning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/">
                  <Button className="w-full" data-testid="button-back-home">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Schedule
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsSuccess(false)}
                  data-testid="button-subscribe-another"
                >
                  Subscribe Another Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <Button variant="ghost" size="icon" className="text-white md:hidden" data-testid="link-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white hidden md:flex" data-testid="link-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white md:hidden" data-testid="link-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white hidden md:flex" data-testid="link-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/gallery">
            <Button variant="ghost" size="icon" className="text-white md:hidden" data-testid="link-gallery-mobile">
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white hidden md:flex" data-testid="link-gallery">
              Gallery
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white md:hidden" data-testid="button-get-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white text-white hidden md:flex" data-testid="button-get-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Link href="/">
          <Button variant="outline" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Schedule
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Subscribe to Game Notifications</CardTitle>
            <CardDescription>
              Get email reminders for Lakers games. You'll receive notifications 24 hours before each game and on game day morning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your.email@example.com"
                          type="email"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormDescription>
                        We'll send game notifications to this email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sports"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Select Sports</FormLabel>
                        <FormDescription>
                          Choose which sports you want to receive notifications for
                        </FormDescription>
                      </div>
                      <div className="space-y-3">
                        {SPORTS.map((sport) => (
                          <FormField
                            key={sport}
                            control={form.control}
                            name="sports"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={sport}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(sport)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, sport])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== sport
                                              )
                                            );
                                      }}
                                      data-testid={`checkbox-${sport.toLowerCase()}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {sport}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={subscribeMutation.isPending}
                  data-testid="button-submit"
                >
                  {subscribeMutation.isPending ? "Subscribing..." : "Subscribe to Notifications"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {pushSupported && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Get instant push alerts on this device — even when the browser is closed. Works best when you add the app to your home screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pushEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <BellRing className="h-5 w-5" />
                    <span className="font-medium" data-testid="text-push-status">Push notifications are enabled</span>
                  </div>
                  {pushSports.length > 0 && (
                    <p className="text-sm text-muted-foreground" data-testid="text-push-sports">
                      Receiving alerts for: {pushSports.join(", ")}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDisablePush}
                    disabled={pushLoading}
                    data-testid="button-disable-push"
                  >
                    {pushLoading ? "Disabling..." : "Disable Push Notifications"}
                  </Button>
                </div>
              ) : (
                <PushSportSelector
                  sports={SPORTS}
                  onEnable={handleEnablePush}
                  loading={pushLoading}
                />
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-muted-foreground text-center mt-6">
          You can unsubscribe at any time using the link in any notification email.
        </p>
      </div>
    </div>
  );
}

function PushSportSelector({ sports, onEnable, loading }: { sports: readonly string[]; onEnable: (sports: string[]) => void; loading: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (sport: string) => {
    setSelected(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {sports.map((sport) => (
          <div key={sport} className="flex flex-row items-center space-x-3">
            <Checkbox
              checked={selected.includes(sport)}
              onCheckedChange={() => toggle(sport)}
              data-testid={`push-checkbox-${sport.toLowerCase().replace(/\s+/g, '-')}`}
            />
            <label className="font-normal cursor-pointer text-sm" onClick={() => toggle(sport)}>
              {sport}
            </label>
          </div>
        ))}
      </div>
      <Button
        className="w-full"
        onClick={() => onEnable(selected)}
        disabled={loading || selected.length === 0}
        data-testid="button-enable-push"
      >
        <BellRing className="mr-2 h-4 w-4" />
        {loading ? "Enabling..." : "Enable Push Notifications"}
      </Button>
    </div>
  );
}

import { useState } from "react";
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
import logoUrl from "@assets/CHSLogo_1763583029891.jpg";
import { ArrowLeft, Check } from "lucide-react";

const SPORTS = ["Football", "Soccer", "Basketball", "Volleyball"] as const;

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  sports: z.array(z.string()).min(1, "Please select at least one sport"),
});

type FormData = z.infer<typeof formSchema>;

export default function Subscribe() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

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
        <header className="h-20 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center px-4 md:px-8 shadow-md">
          <img src={logoUrl} alt="CHS Lakers" className="h-12 md:h-16 mr-4" data-testid="img-logo" />
          <h1 className="text-white text-xl md:text-2xl font-bold" data-testid="text-header">
            Colchester Lakers Athletics
          </h1>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-2xl">
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
      <header className="h-20 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center px-4 md:px-8 shadow-md">
        <img src={logoUrl} alt="CHS Lakers" className="h-12 md:h-16 mr-4" data-testid="img-logo" />
        <h1 className="text-white text-xl md:text-2xl font-bold" data-testid="text-header">
          Colchester Lakers Athletics
        </h1>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
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

        <p className="text-sm text-muted-foreground text-center mt-6">
          You can unsubscribe at any time using the link in any notification email.
        </p>
      </div>
    </div>
  );
}

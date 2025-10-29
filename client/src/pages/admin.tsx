import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

interface SyncConfig {
  googleDriveUrl: string;
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'error' | 'never' | 'syncing';
  lastSyncError: string | null;
}

interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
  gamesImported?: number;
}

export default function Admin() {
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const { toast } = useToast();

  const { data: config, isLoading: configLoading } = useQuery<SyncConfig>({
    queryKey: ["/api/sync/config"],
    refetchInterval: 5000, // Refresh every 5 seconds to show sync status
  });

  const { data: logs = [] } = useQuery<SyncLog[]>({
    queryKey: ["/api/sync/logs"],
    refetchInterval: 5000,
  });

  const updateUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      return await apiRequest("POST", "/api/sync/config", { googleDriveUrl: url });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Google Drive URL updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/config"] });
      setGoogleDriveUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update URL",
        variant: "destructive",
      });
    },
  });

  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/sync/trigger", {});
    },
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "Importing games from Google Drive...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync games",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/logs"] });
    },
  });

  const handleUpdateUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleDriveUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Drive URL",
        variant: "destructive",
      });
      return;
    }
    updateUrlMutation.mutate(googleDriveUrl);
  };

  const handleTriggerSync = () => {
    if (!config?.googleDriveUrl) {
      toast({
        title: "Error",
        description: "Please configure a Google Drive URL first",
        variant: "destructive",
      });
      return;
    }
    triggerSyncMutation.mutate();
  };

  const getStatusBadge = (status: SyncConfig['lastSyncStatus']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-chart-2 text-white">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Error
          </Badge>
        );
      case 'syncing':
        return (
          <Badge className="bg-chart-3 text-white">
            <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
            Syncing...
          </Badge>
        );
      case 'never':
        return (
          <Badge variant="outline">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Never Synced
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-primary via-primary to-[#1e3a5f] shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-white text-2xl md:text-3xl font-bold">
            Admin - Schedule Sync
          </h1>
          <Link href="/">
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Back to Schedule
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Configuration Card */}
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Google Drive Configuration
            </CardTitle>
            <CardDescription>
              Configure the public Google Drive Excel file URL for automatic schedule syncing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {configLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading configuration...</div>
            ) : (
              <>
                {/* Current URL */}
                {config?.googleDriveUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Current URL</Label>
                    <div className="p-3 bg-muted rounded-md break-all text-sm">
                      {config.googleDriveUrl}
                    </div>
                  </div>
                )}

                {/* Update URL Form */}
                <form onSubmit={handleUpdateUrl} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="google-drive-url">New Google Drive URL</Label>
                    <Input
                      id="google-drive-url"
                      type="url"
                      placeholder="https://drive.google.com/file/d/YOUR_FILE_ID/view"
                      value={googleDriveUrl}
                      onChange={(e) => setGoogleDriveUrl(e.target.value)}
                      data-testid="input-google-drive-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the shareable link to your Excel file. Make sure the file is set to "Anyone with the link can view"
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updateUrlMutation.isPending}
                    data-testid="button-update-url"
                  >
                    {updateUrlMutation.isPending ? "Updating..." : "Update URL"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sync Status Card */}
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sync Status
            </CardTitle>
            <CardDescription>
              Automatic sync runs every hour. You can also trigger a manual sync anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Last Sync Time</Label>
                <div className="text-base" data-testid="text-last-sync-time">
                  {config?.lastSyncTime 
                    ? format(new Date(config.lastSyncTime), "MMM d, yyyy 'at' h:mm a")
                    : "Never"
                  }
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <div data-testid="badge-sync-status">
                  {config && getStatusBadge(config.lastSyncStatus)}
                </div>
              </div>
            </div>

            {config?.lastSyncError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive">Error Details</p>
                    <p className="text-sm text-muted-foreground mt-1">{config.lastSyncError}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleTriggerSync}
              disabled={!config?.googleDriveUrl || triggerSyncMutation.isPending || config?.lastSyncStatus === 'syncing'}
              className="w-full md:w-auto"
              data-testid="button-trigger-sync"
            >
              {triggerSyncMutation.isPending || config?.lastSyncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Sync Logs Card */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>Recent sync attempts and their results</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-logs">
                No sync history yet
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-md border ${
                      log.status === 'success' 
                        ? 'bg-chart-2/10 border-chart-2/20' 
                        : 'bg-destructive/10 border-destructive/20'
                    }`}
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-chart-2" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-semibold text-sm">
                            {log.status === 'success' ? 'Success' : 'Error'}
                          </span>
                          {log.gamesImported !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {log.gamesImported} games
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{log.message}</p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.timestamp), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Excel Format Instructions */}
        <Card className="mt-8 bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg">Excel File Format</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your Excel file should have the following columns (case-sensitive):
            </p>
            <div className="bg-card rounded-md p-4 font-mono text-sm space-y-2 border">
              <div className="grid grid-cols-6 gap-2 font-semibold">
                <div>Sport</div>
                <div>Opponent</div>
                <div>Date</div>
                <div>Time</div>
                <div>Location</div>
                <div>Home/Away</div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-muted-foreground">
                <div>Football</div>
                <div>Burlington</div>
                <div>2025-10-17</div>
                <div>7:00 PM</div>
                <div>Lakers Stadium</div>
                <div>home</div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-muted-foreground">
                <div>Soccer</div>
                <div>CVU Redhawks</div>
                <div>2025-10-18</div>
                <div>4:30 PM</div>
                <div>Cougar Field</div>
                <div>away</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p><strong>Sport</strong>: Must be one of: Football, Soccer, Basketball, Volleyball</p>
              <p><strong>Date</strong>: Format: YYYY-MM-DD (e.g., 2025-10-17)</p>
              <p><strong>Home/Away</strong>: Must be either "home" or "away"</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

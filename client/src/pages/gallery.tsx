import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Bell, Image, X, Home as HomeIcon, ChevronLeft, ChevronRight, Camera, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Photo } from "@shared/schema";
import logoUrl from "@assets/CHSLakerNation_1770824041645.png";

export default function Gallery() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  const handleImageError = (photoId: string) => {
    setFailedImages(prev => new Set([...prev, photoId]));
  };

  const workingPhotos = photos.filter(photo => !failedImages.has(photo.id));

  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const goToPrevious = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < workingPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") closeLightbox();
  };

  const selectedPhoto = selectedPhotoIndex !== null ? workingPhotos[selectedPhotoIndex] : null;
  
  const allImagesFailed = photos.length > 0 && workingPhotos.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      {/* Header */}
      <header className="h-16 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between px-3 md:px-8 shadow-md">
        <div className="flex items-center gap-2 md:gap-4">
          <img src={logoUrl} alt="CHS Lakers" className="h-10 md:h-18 w-auto object-contain rounded" data-testid="img-logo" />
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

      <div className="container mx-auto px-3 md:px-4 py-6 md:py-12 max-w-7xl">
        {/* Page Title */}
        <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
          <Camera className="h-6 w-6 md:h-8 md:w-8 text-[hsl(210,85%,35%)]" />
          <h2 className="text-2xl md:text-4xl font-bold text-[hsl(215,25%,20%)]" data-testid="text-gallery-title">
            Photo Gallery
          </h2>
        </div>

        <p className="text-muted-foreground mb-6 md:mb-8">
          Check out photos from our Lakers Athletics events! Students can add photos by uploading them to our shared folder.
        </p>

        {/* Photo Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="aspect-square animate-pulse bg-muted" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Photos Yet</h3>
              <p className="text-muted-foreground">
                Photos will appear here once they're uploaded to the shared Google Drive folder.
              </p>
            </CardContent>
          </Card>
        ) : allImagesFailed ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
              <h3 className="text-xl font-semibold mb-2">Photos Unavailable</h3>
              <p className="text-muted-foreground">
                The photo gallery is not currently configured. Please check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {workingPhotos.map((photo, index) => (
              <Card
                key={photo.id}
                className="aspect-square overflow-hidden cursor-pointer hover-elevate transition-all group"
                onClick={() => openLightbox(index)}
                data-testid={`card-photo-${photo.id}`}
              >
                <div className="relative w-full h-full">
                  <img
                    src={photo.thumbnailUrl || photo.downloadUrl || ""}
                    alt={photo.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    onError={() => handleImageError(photo.id)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent 
          className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">
            {selectedPhoto?.name || "Photo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Photo from Lakers Athletics gallery
          </DialogDescription>
          {selectedPhoto && (
            <div className="relative flex flex-col">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white"
                onClick={closeLightbox}
                data-testid="button-close-lightbox"
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation buttons */}
              {selectedPhotoIndex !== null && selectedPhotoIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white"
                  onClick={goToPrevious}
                  data-testid="button-prev-photo"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {selectedPhotoIndex !== null && selectedPhotoIndex < workingPhotos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white"
                  onClick={goToNext}
                  data-testid="button-next-photo"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              {/* Image */}
              <div className="flex items-center justify-center min-h-[300px] max-h-[80vh]">
                <img
                  src={selectedPhoto.downloadUrl || selectedPhoto.thumbnailUrl || ""}
                  alt={selectedPhoto.name}
                  className="max-w-full max-h-[80vh] object-contain"
                  data-testid="img-lightbox"
                />
              </div>

              {/* Photo info */}
              <div className="p-4 bg-black/80 text-white">
                <p className="font-medium" data-testid="text-photo-name">{selectedPhoto.name}</p>
                {selectedPhoto.createdTime && (
                  <p className="text-sm text-gray-400 mt-1">
                    {format(new Date(selectedPhoto.createdTime), "MMMM d, yyyy")}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : 0} of {workingPhotos.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] text-white py-8 mt-12 shadow-inner">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © 2025 Colchester High School Lakers Athletics. Go Lakers!
          </p>
        </div>
      </footer>
    </div>
  );
}

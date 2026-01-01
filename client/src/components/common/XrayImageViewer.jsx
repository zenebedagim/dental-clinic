import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

const XrayImageViewer = ({ xrayId, onImagesChange, canDelete = true }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!xrayId) return;

    try {
      setLoading(true);
      const response = await api.get(`/xray/${xrayId}/images`);
      const imagesData = response.data?.data || response.data || [];
      setImages(imagesData);
      setCurrentIndex((prevIndex) => {
        if (imagesData.length > 0 && prevIndex >= imagesData.length) {
          return 0;
        }
        return prevIndex;
      });
    } catch (err) {
      console.error("Error fetching X-Ray images:", err);
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [xrayId]);

  useEffect(() => {
    if (xrayId) {
      fetchImages();
    }
  }, [xrayId, fetchImages]);

  const handleDelete = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      await api.delete(`/xray/images/${imageId}`);
      // Remove image from local state
      setImages(images.filter((img) => img.id !== imageId));
      if (currentIndex >= images.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      if (onImagesChange) {
        onImagesChange();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete image");
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-500">Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No X-Ray images available
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="space-y-4">
      {/* Main Image Viewer */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div className="aspect-video flex items-center justify-center">
          <img
            src={currentImage.imageUrl}
            alt={`X-Ray ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={previousImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
              aria-label="Previous image"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
              aria-label="Next image"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Image Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-sm">
          <div className="flex justify-between items-center">
            <span>
              Image {currentIndex + 1} of {images.length}
              {currentImage.imageType && ` • ${currentImage.imageType}`}
            </span>
            {canDelete && (
              <button
                onClick={() => handleDelete(currentImage.id)}
                className="text-red-300 hover:text-red-100 transition-colors"
                aria-label="Delete image"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-24 h-24 border-2 rounded overflow-hidden ${
                index === currentIndex
                  ? "border-indigo-600 ring-2 ring-indigo-300"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <img
                src={image.imageUrl}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <img
              src={currentImage.imageUrl}
              alt={`X-Ray ${currentIndex + 1}`}
              className="max-w-full max-h-screen object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    previousImage();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
              <p className="text-sm">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XrayImageViewer;

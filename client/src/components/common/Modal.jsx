import { useEffect } from "react";

/**
 * Reusable Modal Component
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-lg",
    large: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={closeOnOverlayClick ? onClose : undefined}
        ></div>

        {/* Modal panel */}
        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${sizeClasses[size]}`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
                <h3
                  className="text-lg leading-6 font-medium text-gray-900"
                  id="modal-title"
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="mt-2">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;


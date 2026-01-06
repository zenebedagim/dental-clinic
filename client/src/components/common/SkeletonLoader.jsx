import React from "react";

/**
 * Reusable skeleton loader component
 * Provides loading placeholders for better UX
 */

const SkeletonLoader = ({
  type = "text",
  width = "100%",
  height = "1rem",
  className = "",
  count = 1,
  rounded = false,
}) => {
  const baseClasses = `bg-gray-200 animate-pulse ${
    rounded ? "rounded-full" : "rounded"
  } ${className}`;

  if (type === "text") {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={baseClasses} style={{ width, height }} />
        ))}
      </>
    );
  }

  if (type === "card") {
    return (
      <div className={`${baseClasses} p-4 space-y-3`} style={{ width, height }}>
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
        <div className="h-4 bg-gray-300 rounded w-5/6" />
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-2">
            <div className={`${baseClasses} h-10 flex-1`} />
            <div className={`${baseClasses} h-10 w-24`} />
            <div className={`${baseClasses} h-10 w-32`} />
            <div className={`${baseClasses} h-10 w-20`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "avatar") {
    return (
      <div
        className={`${baseClasses} ${rounded ? "rounded-full" : "rounded"}`}
        style={{ width, height }}
      />
    );
  }

  return <div className={baseClasses} style={{ width, height }} />;
};

export default SkeletonLoader;

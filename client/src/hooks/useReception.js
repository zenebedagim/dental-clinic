import { useContext } from "react";
import ReceptionContext from "../context/ReceptionContext";

/**
 * Custom hook for accessing ReceptionContext
 * @returns {object} ReceptionContext value
 * @throws {Error} If used outside ReceptionProvider
 */
export const useReception = () => {
  const context = useContext(ReceptionContext);
  if (!context) {
    throw new Error("useReception must be used within ReceptionProvider");
  }
  return context;
};


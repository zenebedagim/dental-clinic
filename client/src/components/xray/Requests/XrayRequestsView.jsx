import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import XrayResultFormEnhanced from "../Results/XrayResultFormEnhanced";
import XrayRequestList from "./XrayRequestList";

const XrayRequestsView = () => {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">X-Ray Requests</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          {filter === "pending" && "View pending X-Ray requests"}
          {filter === "completed" && "View completed X-Rays from today"}
          {filter === "all" && "View all X-Ray requests"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <XrayRequestList 
            filter={filter}
            onSelectRequest={setSelectedAppointment} 
          />
        </div>
        <div>
          <XrayResultFormEnhanced 
            appointment={selectedAppointment} 
            onResultSaved={() => {
              // Refresh will be handled by XrayRequestList
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default XrayRequestsView;


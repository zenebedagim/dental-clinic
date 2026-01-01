import { useState, useEffect } from "react";
import api from "../../../services/api";

const XrayRequests = ({ appointment }) => {
  const [xrayResult, setXrayResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (appointment?.xrayResult) {
      setXrayResult(appointment.xrayResult);
    } else {
      setXrayResult(null);
    }
  }, [appointment]);

  if (!appointment) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500 text-center">
          Select a patient to view X-Ray results
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">X-Ray Results</h2>
      {appointment.xrayId ? (
        <>
          {xrayResult ? (
            <div className="space-y-4">
              {xrayResult.sentToDentist ? (
                <>
                  {xrayResult.imageUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        X-Ray Image
                      </label>
                      <img
                        src={xrayResult.imageUrl}
                        alt="X-Ray"
                        className="max-w-full h-auto rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                  {xrayResult.result && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Result
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {xrayResult.result}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  X-Ray result is pending. Waiting for X-Ray doctor to send
                  results.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              X-Ray has been requested. Waiting for results from X-Ray doctor.
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
          No X-Ray doctor assigned to this appointment.
        </div>
      )}
    </div>
  );
};

export default XrayRequests;

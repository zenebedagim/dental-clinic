import XrayImageViewer from "../../common/XrayImageViewer";

const XrayRequests = ({ appointment }) => {
  // Use appointment.xrayResult directly instead of state to avoid unnecessary re-renders
  const xrayResult = appointment?.xrayResult || null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

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
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">X-Ray Results</h2>
      {appointment.xrayId ? (
        <>
          {xrayResult ? (
            <div className="space-y-6">
              {xrayResult.sentToDentist ? (
                <>
                  {/* Status Badge */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          ✓ X-Ray Results Received
                        </p>
                        {xrayResult.updatedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Received: {formatDate(xrayResult.updatedAt)}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Available
                      </span>
                    </div>
                  </div>

                  {/* X-Ray Images */}
                  {xrayResult.id && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        X-Ray Images
                      </h3>
                      <XrayImageViewer
                        xrayId={xrayResult.id}
                        canDelete={false}
                        onImagesChange={() => {}}
                      />
                    </div>
                  )}

                  {/* X-Ray Type */}
                  {xrayResult.xrayType && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        X-Ray Type
                      </h3>
                      <p className="text-base text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                        {xrayResult.xrayType.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}

                  {/* Findings / Notes */}
                  {xrayResult.result && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        Findings / Notes
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {xrayResult.result}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Additional Details */}
                  {(xrayResult.technique ||
                    xrayResult.urgency ||
                    (xrayResult.teeth &&
                      Array.isArray(xrayResult.teeth) &&
                      xrayResult.teeth.length > 0)) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Additional Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {xrayResult.technique && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Technique
                            </p>
                            <p className="text-base text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                              {xrayResult.technique}
                            </p>
                          </div>
                        )}
                        {xrayResult.urgency && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Urgency
                            </p>
                            <p className="text-base text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                              {xrayResult.urgency}
                            </p>
                          </div>
                        )}
                        {xrayResult.teeth &&
                          Array.isArray(xrayResult.teeth) &&
                          xrayResult.teeth.length > 0 && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-medium text-gray-600 mb-1">
                                Teeth Visible
                              </p>
                              <p className="text-base text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                                {xrayResult.teeth.join(", ")}
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Findings JSON (if structured data exists) */}
                  {xrayResult.findings &&
                    typeof xrayResult.findings === "object" && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Detailed Findings
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                            {JSON.stringify(xrayResult.findings, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                </>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  <p className="font-medium">X-Ray result is pending</p>
                  <p className="text-sm mt-1">
                    Waiting for X-Ray doctor to send results.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="font-medium">X-Ray Requested</p>
              <p className="text-sm mt-1">
                Waiting for results from X-Ray doctor.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
          <p className="font-medium">No X-Ray Doctor Assigned</p>
          <p className="text-sm mt-1">
            No X-Ray doctor has been assigned to this appointment.
          </p>
        </div>
      )}
    </div>
  );
};

export default XrayRequests;

import XrayResultFormEnhanced from "../Results/XrayResultFormEnhanced";

const XrayRequestsView = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">X-Ray Requests</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Upload X-Ray results
        </p>
      </div>

      <XrayResultFormEnhanced appointment={null} />
    </div>
  );
};

export default XrayRequestsView;


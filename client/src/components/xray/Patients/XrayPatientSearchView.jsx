import PatientSearch from "../../common/PatientSearch";

const XrayPatientSearchView = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Patient Search & History</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Search for patient records and view X-Ray history
        </p>
      </div>
      <PatientSearch />
    </div>
  );
};

export default XrayPatientSearchView;


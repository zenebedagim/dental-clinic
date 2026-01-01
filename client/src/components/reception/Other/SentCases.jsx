import { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import DataTable from "../../common/DataTable";
import { formatDate } from "../../../utils/tableUtils";

const SentCases = () => {
  const { selectedBranch } = useBranch();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dentistFilter, setDentistFilter] = useState("");
  const [allDentists, setAllDentists] = useState([]);

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchSentCases();
      fetchDentists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const fetchDentists = async () => {
    try {
      const response = await api.get("/users", {
        params: { role: "DENTIST" },
      });
      const dentists = response.data?.data || response.data || [];
      setAllDentists(dentists);
    } catch (err) {
      console.error("Error fetching dentists:", err);
    }
  };

  const fetchSentCases = async () => {
    if (!selectedBranch?.id) {
      return;
    }
    
    // Use AbortController for request cancellation
    const abortController = new AbortController();
    
    try {
      setLoading(true);
      const response = await api.get("/appointments/reception", {
        params: { branchId: selectedBranch.id },
        signal: abortController.signal,
      });
      const data = response.data?.data || response.data || [];
      // Filter appointments that have treatments (sent cases)
      // Note: X-Ray results are not shown to Reception per access control rules
      const sentCases = data.filter((apt) => apt.treatment);
      setAppointments(sentCases);
    } catch (err) {
      // Ignore abort errors
      if (err.name === "AbortError") return;
      
      console.error("Error fetching sent cases:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments based on filters
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    // Filter by dentist
    if (dentistFilter) {
      filtered = filtered.filter(
        (apt) =>
          apt.dentistId === dentistFilter || apt.dentist?.id === dentistFilter
      );
    }

    return filtered;
  }, [appointments, statusFilter, dentistFilter]);

  const columns = [
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      searchable: true,
    },
    {
      key: "dentist.name",
      label: "Dentist",
      sortable: true,
      searchable: true,
      render: (value, row) => row.dentist?.name || "N/A",
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "treatment.status",
      label: "Treatment Status",
      sortable: true,
      render: (value, row) => row.treatment?.status || "—",
    },
    {
      key: "status",
      label: "Appointment Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value === "COMPLETED"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  if (!selectedBranch) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        Please select a branch to view sent cases.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading sent cases...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Sent / Completed Cases
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Appointments that have finished treatments
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dentist Filter
            </label>
            <select
              value={dentistFilter}
              onChange={(e) => setDentistFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            >
              <option value="">All Dentists</option>
              {allDentists.map((dentist) => (
                <option key={dentist.id} value={dentist.id}>
                  {dentist.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DataTable
        data={filteredAppointments}
        columns={columns}
        title="Sent / Completed Cases"
        emptyMessage="No sent cases found"
        pageSize={10}
        searchable={true}
        sortable={true}
        pagination={true}
        exportable={true}
        printable={true}
      />
    </div>
  );
};

export default SentCases;

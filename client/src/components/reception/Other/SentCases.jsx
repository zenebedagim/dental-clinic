import { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import DataTable from "../../common/DataTable";
import { formatDate } from "../../../utils/tableUtils";
import { exportAppointmentsToCSV } from "../../../utils/csvExporter";
import { useToast } from "../../../hooks/useToast";
import SkeletonLoader from "../../common/SkeletonLoader";

const SentCases = () => {
  const { selectedBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dentistFilter, setDentistFilter] = useState("");
  const [allDentists, setAllDentists] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
  });

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

      // Calculate statistics
      setStats({
        total: sentCases.length,
        completed: sentCases.filter((apt) => apt.status === "COMPLETED").length,
        inProgress: sentCases.filter((apt) => apt.status === "IN_PROGRESS")
          .length,
      });
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
    return (
      <div className="space-y-4">
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Sent / Completed Cases
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Appointments that have finished treatments
          </p>
        </div>
        {filteredAppointments.length > 0 && (
          <button
            onClick={() => {
              try {
                exportAppointmentsToCSV(filteredAppointments);
                showSuccess("Sent cases exported successfully");
              } catch (err) {
                showError("Failed to export sent cases");
                console.error("Export error:", err);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
          >
            📥 Export to CSV
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.completed}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.inProgress}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>
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

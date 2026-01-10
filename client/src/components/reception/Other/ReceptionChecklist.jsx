import { useState, useEffect } from "react";

const ReceptionChecklist = () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const storageKey = `reception-checklist-${today}`;

  // Load saved checklist from localStorage
  const loadChecklist = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading checklist:", e);
      }
    }
    return {};
  };

  const [checklist, setChecklist] = useState(loadChecklist);

  // Save checklist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checklist));
  }, [checklist, storageKey]);

  const toggleItem = (category, itemKey) => {
    setChecklist((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [itemKey]: !prev[category]?.[itemKey],
      },
    }));
  };

  const resetChecklist = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all checklist items for today?"
      )
    ) {
      setChecklist({});
      localStorage.removeItem(storageKey);
    }
  };

  const getCategoryProgress = (items) => {
    const checked = Object.values(items || {}).filter(Boolean).length;
    const total = Object.keys(items || {}).length;
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  };

  const getAllProgress = () => {
    const allItems = Object.values(checklist);
    const allChecked = allItems.reduce(
      (acc, cat) => acc + Object.values(cat || {}).filter(Boolean).length,
      0
    );
    const allTotal = allItems.reduce(
      (acc, cat) => acc + Object.keys(cat || {}).length,
      0
    );
    return allTotal > 0 ? Math.round((allChecked / allTotal) * 100) : 0;
  };

  const categories = [
    {
      id: "morning",
      title: "Morning Setup",
      icon: "🌅",
      items: [
        { key: "systems", label: "Start systems & phones" },
        { key: "schedule", label: "Review schedule" },
        { key: "forms", label: "Prep forms & packets" },
        { key: "clean", label: "Clean waiting area" },
        { key: "supplies", label: "Stock supplies" },
      ],
    },
    {
      id: "checkin",
      title: "Patient Check-In",
      icon: "🧑‍🤝‍🧑",
      items: [
        { key: "greet", label: "Greet patient" },
        { key: "confirm", label: "Confirm appointment" },
        { key: "verify", label: "Verify ID & insurance" },
        { key: "copay", label: "Collect co-pay" },
        { key: "system", label: "Check-in in system" },
      ],
    },
    {
      id: "appointments",
      title: "Appointment Management",
      icon: "📆",
      items: [
        { key: "new", label: "Add new appointments" },
        { key: "reschedule", label: "Reschedule or cancel" },
        { key: "reminders", label: "Send reminders" },
      ],
    },
    {
      id: "communications",
      title: "Communications",
      icon: "☎",
      items: [
        { key: "phone", label: "Answer phone calls" },
        { key: "messages", label: "Respond to messages/emails" },
        { key: "relay", label: "Relay notes to clinical staff" },
      ],
    },
    {
      id: "billing",
      title: "Billing & Insurance",
      icon: "🪪",
      items: [
        { key: "insurance", label: "Verify insurance" },
        { key: "payments", label: "Collect payments" },
        { key: "records", label: "Record transactions" },
      ],
    },
    {
      id: "records",
      title: "Record Updates",
      icon: "🗂",
      items: [
        { key: "update", label: "Update patient info" },
        { key: "scan", label: "Scan documents" },
        { key: "confidentiality", label: "Ensure confidentiality" },
      ],
    },
    {
      id: "flow",
      title: "Patient Flow",
      icon: "🧑‍⚕️",
      items: [
        { key: "notify", label: "Notify clinical staff" },
        { key: "direct", label: "Direct patients to waiting/exam rooms" },
      ],
    },
    {
      id: "checkout",
      title: "Check-Out",
      icon: "🧾",
      items: [
        { key: "followup", label: "Schedule follow-ups" },
        { key: "payments", label: "Payments & receipts" },
        { key: "instructions", label: "Provide patient instructions" },
      ],
    },
    {
      id: "closing",
      title: "End-of-Day",
      icon: "🔐",
      items: [
        { key: "close", label: "Close out system logs" },
        { key: "reconcile", label: "Reconcile finances" },
        { key: "tidy", label: "Tidy work area" },
      ],
    },
  ];

  const overallProgress = getAllProgress();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Reception Daily Checklist
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(today).toLocaleDateString("en-ET", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={resetChecklist}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Reset All
        </button>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm font-semibold text-indigo-600">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((category) => {
          const categoryData = checklist[category.id] || {};
          const progress = getCategoryProgress(categoryData);

          return (
            <div
              key={category.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{category.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.title}
                  </h3>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {progress}%
                </span>
              </div>

              <div className="space-y-2">
                {category.items.map((item) => {
                  const isChecked = categoryData[item.key] || false;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(category.id, item.key)}
                        className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span
                        className={`text-gray-700 ${
                          isChecked ? "line-through text-gray-400" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Category Progress Bar */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Your checklist progress is automatically
          saved and will reset at midnight. Use the "Reset All" button if you
          need to start over during the day.
        </p>
      </div>
    </div>
  );
};

export default ReceptionChecklist;

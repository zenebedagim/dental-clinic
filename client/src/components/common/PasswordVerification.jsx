import { useState } from "react";
import api from "../../services/api";
import Modal from "./Modal";
import { useToast } from "../../hooks/useToast";

const PasswordVerification = ({
  isOpen,
  onClose,
  onVerify,
  title = "Password Verification",
}) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { error: showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/verify-password", { password });
      if (response.data?.data?.verified) {
        onVerify(password);
        setPassword("");
        onClose();
      } else {
        setError("Password verification failed");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Password verification failed";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="small">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="verify-password"
            className="block text-sm font-medium text-gray-700"
          >
            Enter your password to continue
          </label>
          <input
            type="password"
            id="verify-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Password"
            autoFocus
            required
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end pt-4 space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !password}
            className="px-4 py-2 text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PasswordVerification;

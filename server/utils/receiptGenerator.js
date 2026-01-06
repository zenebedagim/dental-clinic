/**
 * Payment Receipt Generator
 * Generates HTML receipt that can be printed or converted to PDF
 */

const formatCurrency = (amount) => {
  if (!amount) return "0.00";
  const num =
    typeof amount === "object" && amount.toNumber
      ? amount.toNumber()
      : parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Generate HTML receipt for payment
 * @param {Object} payment - Payment object with appointment and patient data
 * @param {Object} branch - Branch information
 * @returns {string} HTML receipt
 */
const generateReceiptHTML = (payment, branch = {}) => {
  const appointment = payment.appointment || {};
  const patient = appointment.patient || {};
  const treatment = appointment.treatment || {};

  const receiptNumber = payment.id.substring(0, 8).toUpperCase();
  const receiptDate = formatDate(payment.paymentDate || payment.createdAt);
  const patientName = appointment.patientName || patient.name || "N/A";
  const patientPhone = patient.phone || appointment.phoneNumber || "N/A";
  const dentistName = appointment.dentist?.name || "N/A";
  const totalAmount = formatCurrency(payment.amount);
  const paidAmount = formatCurrency(payment.paidAmount);
  const balance = formatCurrency(
    (payment.amount?.toNumber?.() || parseFloat(payment.amount || 0)) -
      (payment.paidAmount?.toNumber?.() || parseFloat(payment.paidAmount || 0))
  );
  const paymentMethod = payment.paymentMethod || "N/A";
  const branchName = branch.name || "Dental Clinic";
  const branchAddress = branch.address || "";
  const branchPhone = branch.phone || "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${receiptNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .receipt {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      color: #333;
      margin-bottom: 10px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .receipt-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 5px;
    }
    .info-section {
      flex: 1;
    }
    .info-section h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .info-section p {
      font-size: 16px;
      color: #333;
      font-weight: 500;
    }
    .details {
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: 2px solid #333;
    }
    .detail-label {
      color: #666;
      font-size: 14px;
    }
    .detail-value {
      color: #333;
      font-size: 14px;
      font-weight: 500;
    }
    .amount-section {
      margin-top: 20px;
      padding: 15px;
      background: #f0f0f0;
      border-radius: 5px;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 16px;
    }
    .total-row {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #333;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .receipt {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${branchName}</h1>
      ${branchAddress ? `<p>${branchAddress}</p>` : ""}
      ${branchPhone ? `<p>Phone: ${branchPhone}</p>` : ""}
    </div>

    <div class="receipt-info">
      <div class="info-section">
        <h3>Receipt Number</h3>
        <p>${receiptNumber}</p>
      </div>
      <div class="info-section">
        <h3>Date</h3>
        <p>${receiptDate}</p>
      </div>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Patient Name:</span>
        <span class="detail-value">${patientName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone:</span>
        <span class="detail-value">${patientPhone}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Dentist:</span>
        <span class="detail-value">${dentistName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Method:</span>
        <span class="detail-value">${paymentMethod}</span>
      </div>
    </div>

    <div class="amount-section">
      <div class="amount-row">
        <span>Total Amount:</span>
        <span>${totalAmount}</span>
      </div>
      <div class="amount-row">
        <span>Amount Paid:</span>
        <span>${paidAmount}</span>
      </div>
      ${
        balance !== formatCurrency(0)
          ? `
      <div class="amount-row">
        <span>Balance:</span>
        <span>${balance}</span>
      </div>
      `
          : ""
      }
      <div class="amount-row total-row">
        <span>Status:</span>
        <span>${payment.paymentStatus || "PAID"}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for your payment!</p>
      <p>This is a computer-generated receipt.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  generateReceiptHTML,
  formatCurrency,
  formatDate,
};

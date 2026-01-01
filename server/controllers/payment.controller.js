const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

const createPayment = async (req, res) => {
  try {
    const {
      appointmentId,
      amount,
      paidAmount = 0,
      paymentStatus = "UNPAID",
      paymentMethod,
      notes,
      isHidden = false,
    } = req.body;
    const { id: userId, role, branchId } = req.user;

    // Verify appointment exists and belongs to reception's branch
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        branch: true,
        treatment: true,
      },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    // Reception can only create payments for appointments in their branch
    if (role === "RECEPTION" && appointment.branchId !== branchId) {
      return sendError(
        res,
        "You can only create payments for appointments in your branch",
        403
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { appointmentId },
    });

    if (existingPayment) {
      return sendError(res, "Payment already exists for this appointment", 400);
    }

    // Validate paidAmount doesn't exceed amount
    if (paidAmount > amount) {
      return sendError(res, "Paid amount cannot exceed total amount", 400);
    }

    // Determine payment status based on paidAmount if not explicitly provided
    let finalPaymentStatus = paymentStatus;
    if (paymentStatus === "UNPAID" || !paymentStatus) {
      if (paidAmount === 0) {
        finalPaymentStatus = "UNPAID";
      } else if (paidAmount >= amount) {
        finalPaymentStatus = "PAID";
      } else {
        finalPaymentStatus = "PARTIAL";
      }
    }

    // Use treatment totalCost if available, otherwise use provided amount
    const finalAmount =
      appointment.treatment?.totalCost?.toNumber() || parseFloat(amount);

    const payment = await prisma.payment.create({
      data: {
        appointmentId,
        amount: finalAmount,
        paidAmount: parseFloat(paidAmount || 0),
        paymentStatus: finalPaymentStatus,
        paymentMethod: paymentMethod || null,
        paymentDate: finalPaymentStatus !== "UNPAID" ? new Date() : null,
        showDetailedBilling: false, // Default to false - dentist must enable it
        isHidden: isHidden === true || isHidden === "true", // Allow reception to mark as hidden
        notes: notes || null,
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            treatment: true,
          },
        },
      },
    });

    // Notify reception about payment creation (if different from creator)
    try {
      const notificationService = require('../services/notification.service');
      const { NotificationType } = require('../utils/notificationTypes');
      
      if (payment.appointment.receptionistId && payment.appointment.receptionistId !== userId) {
        await notificationService.notifyUser(payment.appointment.receptionistId, {
          type: NotificationType.PAYMENT_CREATED,
          title: 'Payment Created',
          message: `Payment of ${payment.amount} created for ${payment.appointment.patientName || payment.appointment.patient?.name || 'patient'}`,
          data: {
            paymentId: payment.id,
            appointmentId: payment.appointmentId,
            amount: payment.amount.toString(),
          },
        });
      }
    } catch (notifError) {
      console.error('Error sending payment creation notification:', notifError);
    }

    return sendSuccess(res, payment, 201, "Payment created successfully");
  } catch (error) {
    console.error("Create payment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paidAmount,
      paymentStatus,
      paymentMethod,
      notes,
      paymentDate,
      isHidden,
    } = req.body;
    const { id: userId, role, branchId } = req.user;

    // Find payment
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!payment) {
      return sendError(res, "Payment not found", 404);
    }

    // Reception can only update payments for appointments in their branch
    if (role === "RECEPTION" && payment.appointment.branchId !== branchId) {
      return sendError(
        res,
        "You can only update payments for appointments in your branch",
        403
      );
    }

    // Build update data
    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentDate !== undefined) updateData.paymentDate = new Date(paymentDate);
    if (isHidden !== undefined) updateData.isHidden = isHidden === true || isHidden === "true";

    // Determine payment status
    const finalAmount = amount !== undefined ? parseFloat(amount) : payment.amount.toNumber();
    const finalPaidAmount = paidAmount !== undefined ? parseFloat(paidAmount) : payment.paidAmount.toNumber();

    if (finalPaidAmount > finalAmount) {
      return sendError(res, "Paid amount cannot exceed total amount", 400);
    }

    // Auto-determine status if not explicitly provided
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    } else {
      if (finalPaidAmount === 0) {
        updateData.paymentStatus = "UNPAID";
      } else if (finalPaidAmount >= finalAmount) {
        updateData.paymentStatus = "PAID";
      } else {
        updateData.paymentStatus = "PARTIAL";
      }
    }

    // Set payment date if payment status is being updated to PAID/PARTIAL
    if (
      updateData.paymentStatus &&
      (updateData.paymentStatus === "PAID" || updateData.paymentStatus === "PARTIAL") &&
      !paymentDate
    ) {
      updateData.paymentDate = new Date();
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            treatment: true,
          },
        },
      },
    });

    // Notify reception about payment update
    try {
      const notificationService = require('../services/notification.service');
      const { NotificationType } = require('../utils/notificationTypes');
      
      if (updatedPayment.appointment.receptionistId && updatedPayment.appointment.receptionistId !== userId) {
        await notificationService.notifyUser(updatedPayment.appointment.receptionistId, {
          type: NotificationType.PAYMENT_UPDATED,
          title: 'Payment Updated',
          message: `Payment status updated to ${updatedPayment.paymentStatus} for ${updatedPayment.appointment.patientName || updatedPayment.appointment.patient?.name || 'patient'}`,
          data: {
            paymentId: updatedPayment.id,
            appointmentId: updatedPayment.appointmentId,
            paymentStatus: updatedPayment.paymentStatus,
            amount: updatedPayment.amount.toString(),
          },
        });
      }
    } catch (notifError) {
      console.error('Error sending payment update notification:', notifError);
    }

    return sendSuccess(res, updatedPayment, 200, "Payment updated successfully");
  } catch (error) {
    console.error("Update payment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getPayments = async (req, res) => {
  try {
    console.log("=== getPayments Request ===");
    console.log("Query params:", JSON.stringify(req.query, null, 2));
    console.log("User:", req.user ? { id: req.user.id, role: req.user.role, branchId: req.user.branchId } : "NO USER");
    
    // Validate req.user exists
    if (!req.user) {
      console.error("No user in request");
      return sendError(res, "Authentication required", 401);
    }
    
    const { 
      branchId: queryBranchId, 
      status, 
      startDate, 
      endDate,
      minAmount,
      maxAmount,
      dentistId,
      isHidden,
      limit,
      skip
    } = req.query;
    const { id: userId, role, branchId } = req.user;
    
    console.log("User role:", role);
    console.log("User branchId:", branchId);
    console.log("Query branchId:", queryBranchId);

    // Reception can only see payments in their own branch (enforced automatically)
    // For RECEPTION role, always use their branchId (from user token)
    // For other roles, use queryBranchId if provided
    const filterBranchId = role === "RECEPTION" ? branchId : queryBranchId;

    // Validate branchId for RECEPTION role
    if (role === "RECEPTION" && !branchId) {
      console.error("RECEPTION user missing branchId");
      return sendError(res, "Branch ID is required for reception users", 400);
    }

    // Validate branchId if provided in query
    if (filterBranchId && typeof filterBranchId !== 'string') {
      console.error("Invalid branchId type:", typeof filterBranchId, filterBranchId);
      return sendError(res, "Invalid branch ID format", 400);
    }

    // Build where clause - always require branchId for filtering
    const where = {};

    // Build appointment filter object - always include branchId for RECEPTION
    const appointmentFilter = {};
    if (filterBranchId) {
      appointmentFilter.branchId = filterBranchId;
    } else if (role === "RECEPTION") {
      // If RECEPTION but no branchId, this is an error
      console.error("RECEPTION user has no branchId to filter by");
      return sendError(res, "Branch ID is required", 400);
    }
    
    if (dentistId) {
      appointmentFilter.dentistId = dentistId;
    }
    
    // Receptionists can see all payments in their branch (branch-level access)
    // Branch isolation is enforced by filterBranchId above - reception cannot see other branches
    // Always set appointment filter if we have branchId (required for RECEPTION)
    // For RECEPTION, branchId is required, so we should always have appointment filter
    if (filterBranchId || dentistId) {
      where.appointment = appointmentFilter;
    } else {
      // This shouldn't happen for RECEPTION (we check above), but handle it anyway
      console.warn("No branchId or dentistId provided, querying all payments (not recommended)");
    }

    if (status) {
      where.paymentStatus = status;
    }

    // Filter by isHidden if provided (for private payments)
    // When isHidden=true, only shows private/hidden payments for the branch
    // When isHidden=false, only shows visible payments for the branch
    // When isHidden not provided, shows all payments for the branch (both visible and hidden)
    // Branch filtering always applies regardless of isHidden value
    if (isHidden !== undefined) {
      where.isHidden = isHidden === "true" || isHidden === true;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    // Amount range filter - use Prisma.Decimal for Decimal fields
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) {
        const min = parseFloat(minAmount);
        if (!isNaN(min)) {
          // For Decimal fields, Prisma accepts numbers directly
          where.amount.gte = min;
        }
      }
      if (maxAmount !== undefined) {
        const max = parseFloat(maxAmount);
        if (!isNaN(max)) {
          // For Decimal fields, Prisma accepts numbers directly
          where.amount.lte = max;
        }
      }
      // If amount filter is empty, remove it
      if (Object.keys(where.amount).length === 0) {
        delete where.amount;
      }
    }

    // Build query options with pagination and optimized includes
    // Ensure where clause is valid and not empty (must have at least one condition)
    if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
      console.error("Invalid or empty where clause:", where);
      // If no filters at all, return empty array (shouldn't happen for RECEPTION)
      if (role === "RECEPTION") {
        return sendError(res, "Branch ID is required for filtering", 400);
      }
      // For other roles, return empty result if no filters
      return sendSuccess(res, []);
    }

    const queryOptions = {
      where,
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            receptionist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            // Only include treatment if needed (optimize for network speed)
            treatment: {
              select: {
                id: true,
                totalCost: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };

    // Add pagination if provided (for better performance on large datasets)
    if (limit !== undefined) {
      queryOptions.take = parseInt(limit, 10);
    } else {
      // Default limit to prevent loading too much data at once
      queryOptions.take = 100;
    }
    
    if (skip !== undefined) {
      queryOptions.skip = parseInt(skip, 10);
    }

    console.log("=== getPayments Query Options ===");
    try {
      // Create a safe copy for logging (remove Date objects)
      const safeWhere = JSON.parse(JSON.stringify(queryOptions.where, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      console.log("Where clause:", JSON.stringify(safeWhere, null, 2));
    } catch (e) {
      console.log("Where clause (could not stringify):", queryOptions.where);
      console.log("Stringify error:", e.message);
    }
    console.log("Take:", queryOptions.take);
    console.log("Skip:", queryOptions.skip);
    console.log("Include structure keys:", Object.keys(queryOptions.include || {}));
    
    try {
      console.log("Executing Prisma query...");
      const payments = await prisma.payment.findMany(queryOptions);
      console.log("Prisma query executed successfully");

      console.log("=== getPayments Success ===");
      console.log(`Returning ${payments.length} payments`);
      
      return sendSuccess(res, payments);
    } catch (prismaError) {
      console.error("=== getPayments Prisma Error ===");
      console.error("Prisma error code:", prismaError.code);
      console.error("Prisma error message:", prismaError.message);
      console.error("Prisma error meta:", prismaError.meta);
      throw prismaError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("=== getPayments Error ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.meta) {
      console.error("Error meta:", error.meta);
    }
    return sendError(res, `Server error: ${error.message}`, 500, {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  }
};

const getPaymentByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { id: userId, role, branchId } = req.user;

    const payment = await prisma.payment.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            receptionist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            treatment: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return sendError(res, "Payment not found", 404);
    }

    // Reception can only view payments for appointments in their branch
    if (role === "RECEPTION") {
      if (payment.appointment.branchId !== branchId) {
        return sendError(
          res,
          "You can only view payments for appointments in your branch",
          403
        );
      }
      // Receptionists can see all payments in their branch (branch-level isolation)
    }

    // For receptionists, check if detailed billing is enabled
    // Dentists always see full details regardless of flag
    if (role === "RECEPTION" && !payment.showDetailedBilling) {
      // Return payment with basic info only (detailed billing section hidden)
      // The client will handle conditional rendering based on this flag
    }

    return sendSuccess(res, payment);
  } catch (error) {
    console.error("Get payment by appointment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Toggle detailed billing visibility for a payment
 * Only dentists can enable/disable this
 */
const toggleDetailedBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const { id: userId, role } = req.user;

    // Only dentists can toggle detailed billing
    if (role !== "DENTIST") {
      return sendError(
        res,
        "Only dentists can toggle detailed billing visibility",
        403
      );
    }

    // Find payment and verify it belongs to this dentist's appointment
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            dentist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return sendError(res, "Payment not found", 404);
    }

    // Verify the appointment belongs to this dentist
    if (payment.appointment.dentistId !== userId) {
      return sendError(
        res,
        "You can only toggle detailed billing for your own appointments",
        403
      );
    }

    // Update the showDetailedBilling flag
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        showDetailedBilling: enabled === true || enabled === "true",
        detailedBillingEnabledBy: enabled === true || enabled === "true" ? userId : null,
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            treatment: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Notify reception when detailed billing is enabled
    if (enabled && updatedPayment.appointment.receptionistId) {
      try {
        const notificationService = require('../services/notification.service');
        const { NotificationType } = require('../utils/notificationTypes');
        
        await notificationService.notifyUser(updatedPayment.appointment.receptionistId, {
          type: NotificationType.DETAILED_BILLING_ENABLED,
          title: 'Detailed Billing Enabled',
          message: `Detailed billing has been enabled for payment of ${updatedPayment.appointment.patientName || updatedPayment.appointment.patient?.name || 'patient'}`,
          data: {
            paymentId: updatedPayment.id,
            appointmentId: updatedPayment.appointmentId,
          },
        });
      } catch (notifError) {
        console.error('Error sending detailed billing notification:', notifError);
      }
    }

    return sendSuccess(
      res,
      updatedPayment,
      200,
      `Detailed billing ${enabled ? "enabled" : "disabled"} successfully`
    );
  } catch (error) {
    console.error("Toggle detailed billing error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  createPayment,
  updatePayment,
  getPayments,
  getPaymentByAppointment,
  toggleDetailedBilling,
};


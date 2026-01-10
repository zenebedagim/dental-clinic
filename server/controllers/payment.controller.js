const prisma = require("../config/db");
const {
  sendSuccess,
  sendError,
  sendPaginatedSuccess,
} = require("../utils/response.util");
const { generateReceiptHTML } = require("../utils/receiptGenerator");
const { logSensitiveAction } = require("../middleware/auditLogger");

const createPayment = async (req, res) => {
  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "payment.controller.js:10",
      message: "createPayment entry",
      data: {
        appointmentId: req.body?.appointmentId,
        userId: req.user?.id,
        role: req.user?.role,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion
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
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:22",
        message: "extracted request data",
        data: {
          appointmentId,
          amount,
          paidAmount,
          paymentStatus,
          hasNotes: !!notes,
          isHidden,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    // Verify appointment exists
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:24",
        message: "before appointment query",
        data: { appointmentId },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        branch: true,
        treatments: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the most recent treatment
        },
        dentist: {
          select: {
            id: true,
          },
        },
      },
    });
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:38",
        message: "after appointment query",
        data: {
          found: !!appointment,
          hasTreatments: !!appointment?.treatments,
          hasBranch: !!appointment?.branch,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion

    // Transform for backward compatibility
    if (
      appointment &&
      appointment.treatments &&
      Array.isArray(appointment.treatments)
    ) {
      appointment.treatment =
        appointment.treatments.length > 0 ? appointment.treatments[0] : null;
    }

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

    // Dentist can only create payments for their own appointments
    if (role === "DENTIST" && appointment.dentistId !== userId) {
      return sendError(
        res,
        "You can only create payments for your own appointments",
        403
      );
    }

    // Allow multiple payments per appointment - removed duplicate check
    // Users can now create 10+ payments for the same appointment

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

    // Use treatment totalCost if available, otherwise use provided amount, or default to 0
    const finalAmount =
      appointment.treatment?.totalCost?.toNumber() ||
      (amount !== undefined ? parseFloat(amount) : 0);
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:96",
        message: "before payment create",
        data: {
          finalAmount,
          appointmentId,
          finalPaymentStatus,
          paidAmount: parseFloat(paidAmount || 0),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
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
            treatments: {
              orderBy: { createdAt: "desc" },
              take: 1, // Get only the most recent treatment
            },
          },
        },
      },
    });
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:148",
        message: "after payment create success",
        data: { paymentId: payment?.id, appointmentId: payment?.appointmentId },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    // Transform for backward compatibility
    if (
      payment.appointment.treatments &&
      Array.isArray(payment.appointment.treatments)
    ) {
      payment.appointment.treatment =
        payment.appointment.treatments.length > 0
          ? payment.appointment.treatments[0]
          : null;
    }

    // Update appointment status based on treatment and payment state
    if (payment.appointment.treatments && payment.appointment.treatments.length > 0) {
      try {
        const treatments = payment.appointment.treatments;
        const latestTreatment = treatments[0]; // Already sorted by createdAt desc
        
        // Get all payments for this appointment to check if fully paid
        const allPayments = await prisma.payment.findMany({
          where: { appointmentId: appointmentId, isHidden: false },
        });

        const totalAmount = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.paidAmount || 0), 0);
        const allPaymentsPaid = allPayments.length > 0 && totalPaid >= totalAmount;

        let newStatus = appointment.status;

        // If appointment is PENDING and has treatment, set to IN_PROGRESS
        if (appointment.status === "PENDING") {
          newStatus = "IN_PROGRESS";
        }
        // If treatment is COMPLETED and all payments are fully paid, set to COMPLETED
        else if (
          latestTreatment.status === "COMPLETED" &&
          allPaymentsPaid &&
          appointment.status !== "COMPLETED"
        ) {
          newStatus = "COMPLETED";
        }

        // Update appointment status if it changed
        if (newStatus !== appointment.status) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: newStatus },
          });
          payment.appointment.status = newStatus;
        }
      } catch (updateError) {
        // Don't fail payment creation if status update fails
        console.error("Error updating appointment status:", updateError);
      }
    } else if (appointment.status === "PENDING") {
      // If no treatment yet but payment is made, still set to IN_PROGRESS
      // (treatment might be created later)
      try {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "IN_PROGRESS" },
        });
        payment.appointment.status = "IN_PROGRESS";
      } catch (updateError) {
        console.error("Error updating appointment status:", updateError);
      }
    }

    // Log sensitive action (non-blocking - don't fail if logging fails)
    logSensitiveAction(req, "CREATE_PAYMENT", {
      paymentId: payment.id,
      appointmentId: appointmentId,
      amount: finalAmount,
      paidAmount: parseFloat(paidAmount || 0),
      status: finalPaymentStatus,
    }).catch((logError) => {
      console.error("Error logging create payment action:", logError);
    });

    return sendSuccess(res, payment, 201, "Payment created successfully");
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:173",
        message: "createPayment error caught",
        data: {
          errorMessage: error?.message,
          errorCode: error?.code,
          errorName: error?.name,
          prismaCode: error?.code,
          prismaMeta: error?.meta,
          stack: error?.stack?.substring(0, 500),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion
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
    if (paidAmount !== undefined)
      updateData.paidAmount = parseFloat(paidAmount);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentDate !== undefined)
      updateData.paymentDate = new Date(paymentDate);
    if (isHidden !== undefined)
      updateData.isHidden = isHidden === true || isHidden === "true";

    // Determine payment status
    const finalAmount =
      amount !== undefined ? parseFloat(amount) : payment.amount.toNumber();
    const finalPaidAmount =
      paidAmount !== undefined
        ? parseFloat(paidAmount)
        : payment.paidAmount.toNumber();

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
      (updateData.paymentStatus === "PAID" ||
        updateData.paymentStatus === "PARTIAL") &&
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
            treatments: {
              orderBy: { createdAt: "desc" },
              take: 1, // Get only the most recent treatment
            },
          },
        },
      },
    });

    // Transform for backward compatibility
    if (
      payment.appointment.treatments &&
      Array.isArray(payment.appointment.treatments)
    ) {
      payment.appointment.treatment =
        payment.appointment.treatments.length > 0
          ? payment.appointment.treatments[0]
          : null;
    }

    // Log sensitive action (non-blocking - don't fail if logging fails)
    logSensitiveAction(req, "UPDATE_PAYMENT", {
      paymentId: id,
      changes: updateData,
    }).catch((logError) => {
      console.error("Error logging update payment action:", logError);
    });

    return sendSuccess(
      res,
      updatedPayment,
      200,
      "Payment updated successfully"
    );
  } catch (error) {
    console.error("Update payment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getPayments = async (req, res) => {
  try {
    console.log("=== getPayments Request ===");
    console.log("Query params:", JSON.stringify(req.query, null, 2));
    console.log(
      "User:",
      req.user
        ? { id: req.user.id, role: req.user.role, branchId: req.user.branchId }
        : "NO USER"
    );

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
      appointmentId,
      isHidden,
      limit,
      skip,
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
    if (filterBranchId && typeof filterBranchId !== "string") {
      console.error(
        "Invalid branchId type:",
        typeof filterBranchId,
        filterBranchId
      );
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

    // For DENTIST role, automatically filter by their own dentistId
    if (role === "DENTIST") {
      appointmentFilter.dentistId = userId;
    }

    // Filter by specific appointmentId if provided
    if (appointmentId) {
      appointmentFilter.id = appointmentId;
    }

    // Receptionists can see all payments in their branch (branch-level access)
    // Branch isolation is enforced by filterBranchId above - reception cannot see other branches
    // Always set appointment filter if we have branchId (required for RECEPTION)
    // For RECEPTION, branchId is required, so we should always have appointment filter
    if (filterBranchId || dentistId) {
      where.appointment = appointmentFilter;
    } else {
      // This shouldn't happen for RECEPTION (we check above), but handle it anyway
      console.warn(
        "No branchId or dentistId provided, querying all payments (not recommended)"
      );
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
    if (
      !where ||
      typeof where !== "object" ||
      Object.keys(where).length === 0
    ) {
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
            // Only include most recent treatment if needed (optimize for network speed)
            treatments: {
              select: {
                id: true,
                totalCost: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1, // Get only the most recent treatment
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
      const safeWhere = JSON.parse(
        JSON.stringify(queryOptions.where, (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        })
      );
      console.log("Where clause:", JSON.stringify(safeWhere, null, 2));
    } catch (e) {
      console.log("Where clause (could not stringify):", queryOptions.where);
      console.log("Stringify error:", e.message);
    }
    console.log("Take:", queryOptions.take);
    console.log("Skip:", queryOptions.skip);
    console.log(
      "Include structure keys:",
      Object.keys(queryOptions.include || {})
    );

    try {
      console.log("Executing Prisma query...");

      // Get total count for pagination metadata
      const total = await prisma.payment.count({ where });

      // Calculate pagination metadata
      const page =
        skip !== undefined
          ? Math.floor(parseInt(skip, 10) / parseInt(limit || 100, 10)) + 1
          : 1;
      const pageSize = limit !== undefined ? parseInt(limit, 10) : 100;

      const payments = await prisma.payment.findMany(queryOptions);
      console.log("Prisma query executed successfully");

      console.log("=== getPayments Success ===");
      console.log(`Returning ${payments.length} payments`);

      // Transform for backward compatibility
      const transformedPayments = payments.map((payment) => {
        if (
          payment.appointment.treatments &&
          Array.isArray(payment.appointment.treatments)
        ) {
          payment.appointment.treatment =
            payment.appointment.treatments.length > 0
              ? payment.appointment.treatments[0]
              : null;
        }
        return payment;
      });

      return sendPaginatedSuccess(
        res,
        transformedPayments,
        { total, page, pageSize },
        200,
        "Payments retrieved successfully"
      );
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
      meta: error.meta,
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, branchId } = req.user;

    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { id },
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

    // Check permissions
    // RECEPTION can only see payments in their branch
    if (role === "RECEPTION" && payment.appointment.branchId !== branchId) {
      return sendError(res, "You can only view payments in your branch", 403);
    }

    // DENTIST can only see payments for their own appointments
    if (role === "DENTIST" && payment.appointment.dentistId !== userId) {
      return sendError(
        res,
        "You can only view payments for your own appointments",
        403
      );
    }

    return sendSuccess(res, payment);
  } catch (error) {
    console.error("Get payment by ID error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getPaymentByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { id: userId, role, branchId } = req.user;

    // Get all payments for this appointment (now supports multiple payments)
    const payments = await prisma.payment.findMany({
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
            treatments: {
              orderBy: { createdAt: "desc" },
              take: 1, // Get only the most recent treatment
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
    });

    if (!payments || payments.length === 0) {
      return sendError(res, "No payments found for this appointment", 404);
    }

    // Transform for backward compatibility
    const transformedPayments = payments.map((payment) => {
      if (
        payment.appointment.treatments &&
        Array.isArray(payment.appointment.treatments)
      ) {
        payment.appointment.treatment =
          payment.appointment.treatments.length > 0
            ? payment.appointment.treatments[0]
            : null;
      }
      return payment;
    });

    // Reception can only view payments for appointments in their branch
    if (role === "RECEPTION") {
      const firstPayment = transformedPayments[0];
      if (firstPayment && firstPayment.appointment.branchId !== branchId) {
        return sendError(
          res,
          "You can only view payments for appointments in your branch",
          403
        );
      }
      // Receptionists can see all payments in their branch (branch-level isolation)
    }

    // Return all payments for the appointment (supports multiple payments)
    return sendSuccess(res, transformedPayments);
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
        detailedBillingEnabledBy:
          enabled === true || enabled === "true" ? userId : null,
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
            treatments: {
              orderBy: { createdAt: "desc" },
              take: 1, // Get only the most recent treatment
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
    });

    // Transform for backward compatibility
    if (
      updatedPayment.appointment.treatments &&
      Array.isArray(updatedPayment.appointment.treatments)
    ) {
      updatedPayment.appointment.treatment =
        updatedPayment.appointment.treatments.length > 0
          ? updatedPayment.appointment.treatments[0]
          : null;
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

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const { branchId: userBranchId, role } = req.user;
    const { branchId: queryBranchId, startDate, endDate } = req.query;

    // Determine branch filter
    let branchId;
    if (role === "ADMIN") {
      branchId = queryBranchId;
    } else {
      branchId = userBranchId;
    }

    const where = {};
    if (branchId) {
      where.appointment = { branchId };
    }

    // Date range filter
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

    // Get all payments for stats
    const payments = await prisma.payment.findMany({
      where,
      include: {
        appointment: {
          select: {
            branchId: true,
            date: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalRevenue = payments
      .filter(
        (p) => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIAL"
      )
      .reduce((sum, p) => sum + p.paidAmount.toNumber(), 0);

    const totalAmount = payments.reduce(
      (sum, p) => sum + p.amount.toNumber(),
      0
    );

    const unpaidCount = payments.filter(
      (p) => p.paymentStatus === "UNPAID"
    ).length;

    const partialCount = payments.filter(
      (p) => p.paymentStatus === "PARTIAL"
    ).length;

    const paidCount = payments.filter((p) => p.paymentStatus === "PAID").length;

    const collectionRate =
      totalAmount > 0 ? (totalRevenue / totalAmount) * 100 : 0;

    const stats = {
      totalRevenue,
      totalAmount,
      unpaidCount,
      partialCount,
      paidCount,
      totalCount: payments.length,
      collectionRate: Math.round(collectionRate * 100) / 100,
    };

    return sendSuccess(res, stats, 200, "Payment statistics retrieved");
  } catch (error) {
    console.error("Get payment stats error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const generateReceipt = async (req, res) => {
  // #region agent log
  fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "payment.controller.js:918",
      message: "generateReceipt entry",
      data: {
        paymentId: req.params?.id,
        userId: req.user?.id,
        role: req.user?.role,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "E",
    }),
  }).catch(() => {});
  // #endregion
  try {
    const { id } = req.params;
    const { branchId: userBranchId, role } = req.user;
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:923",
        message: "before payment query",
        data: { paymentId: id },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion

    // Get payment with all related data
    const payment = await prisma.payment.findUnique({
      where: { id },
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
            treatments: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            branch: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:959",
        message: "after payment query",
        data: {
          found: !!payment,
          hasAppointment: !!payment?.appointment,
          hasBranch: !!payment?.appointment?.branch,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion

    if (!payment) {
      return sendError(res, "Payment not found", 404);
    }

    // Check permissions
    if (role === "RECEPTION" && payment.appointment.branchId !== userBranchId) {
      return sendError(
        res,
        "You can only generate receipts for payments in your branch",
        403
      );
    }

    // Transform treatment for backward compatibility
    if (
      payment.appointment.treatments &&
      Array.isArray(payment.appointment.treatments)
    ) {
      payment.appointment.treatment =
        payment.appointment.treatments.length > 0
          ? payment.appointment.treatments[0]
          : null;
    }

    // Generate receipt HTML
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:985",
        message: "before generateReceiptHTML",
        data: {
          hasPayment: !!payment,
          hasAppointment: !!payment?.appointment,
          hasBranch: !!payment?.appointment?.branch,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion
    const receiptHTML = generateReceiptHTML(
      payment,
      payment.appointment.branch
    );
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:990",
        message: "after generateReceiptHTML",
        data: { hasHTML: !!receiptHTML, htmlLength: receiptHTML?.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion

    // Return HTML receipt
    res.setHeader("Content-Type", "text/html");
    return res.send(receiptHTML);
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "payment.controller.js:996",
        message: "generateReceipt error caught",
        data: {
          errorMessage: error?.message,
          errorCode: error?.code,
          errorName: error?.name,
          prismaCode: error?.code,
          prismaMeta: error?.meta,
          stack: error?.stack?.substring(0, 500),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion
    console.error("Generate receipt error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, branchId } = req.user;

    // Find the payment
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

    // Check permissions
    // RECEPTION can only delete payments in their branch
    if (role === "RECEPTION" && payment.appointment.branchId !== branchId) {
      return sendError(res, "You can only delete payments in your branch", 403);
    }

    // Delete the payment
    await prisma.payment.delete({
      where: { id },
    });

    // Log sensitive action (non-blocking)
    logSensitiveAction(req, "DELETE_PAYMENT", {
      paymentId: id,
      appointmentId: payment.appointmentId,
      amount: payment.amount,
      branchId: payment.appointment.branchId,
    }).catch((logError) => {
      console.error("Error logging delete payment action:", logError);
    });

    return sendSuccess(res, null, 200, "Payment deleted successfully");
  } catch (error) {
    console.error("Delete payment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  createPayment,
  updatePayment,
  getPayments,
  getPaymentById,
  getPaymentByAppointment,
  toggleDetailedBilling,
  getPaymentStats,
  generateReceipt,
  deletePayment,
};

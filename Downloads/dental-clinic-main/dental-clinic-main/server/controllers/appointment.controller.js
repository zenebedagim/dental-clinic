const prisma = require("../config/db");
const fs = require("fs");
const path = require("path");
const {
  sendSuccess,
  sendError,
  sendPaginatedSuccess,
} = require("../utils/response.util");
const { logSensitiveAction } = require("../middleware/auditLogger");

// Helper to log debug data
const debugLog = (data) => {
  try {
    // Get project root: go up from server/controllers to project root
    const projectRoot = path.resolve(__dirname, "../..");
    const logPath = path.join(projectRoot, ".cursor", "debug.log");
    const logEntry = JSON.stringify(data) + "\n";
    fs.appendFileSync(logPath, logEntry, "utf8");
  } catch (err) {
    // Log to console as fallback
    console.error("Debug log error:", err.message, "Path attempted:", path.resolve(__dirname, "../..", ".cursor", "debug.log"));
  }
};

// Helper function to transform appointments for backward compatibility
const transformAppointmentsForBackwardCompatibility = (appointments) => {
  return appointments.map((apt) => {
    const transformed = { ...apt };
    // Add backward compatibility fields if needed
    if (apt.treatments && apt.treatments.length > 0) {
      transformed.treatment = apt.treatments[0];
    }
    return transformed;
  });
};

// Create appointment
const createAppointment = async (req, res) => {
  // #region agent log
  debugLog({
    location: "appointment.controller.js:22",
    message: "createAppointment entry",
    data: {
      requestBody: req.body,
      hasPatientId: !!req.body.patientId,
      userRole: req.user?.role,
    },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "H1",
  });
  // #endregion
  try {
    const { id: userId, branchId, role } = req.user;
    const { patientId, patientName, dentistId, xrayId, date, visitReason } =
      req.body;

    // #region agent log
    debugLog({
      location: "appointment.controller.js:29",
      message: "extracted appointment data",
      data: {
        patientId,
        hasPatientId: !!patientId,
        dentistId,
        hasDentistId: !!dentistId,
        date,
        hasDate: !!date,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H1",
    });
    // #endregion

    // Validate required fields
    if (!patientId) {
      // #region agent log
      debugLog({
        location: "appointment.controller.js:30",
        message: "validation error - no patientId",
        data: { requestBody: req.body },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H1",
      });
      // #endregion
      return sendError(res, "Patient ID is required", 400);
    }

    if (!dentistId || !date) {
      return sendError(res, "Dentist and date are required", 400);
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return sendError(res, "Patient not found", 404);
    }

    // Use patient name from database if not provided
    const finalPatientName = patientName || patient.name;

    // Verify dentist exists and is in the same branch (if not admin)
    const dentist = await prisma.user.findUnique({
      where: { id: dentistId },
    });

    if (!dentist || dentist.role !== "DENTIST") {
      return sendError(res, "Invalid dentist", 400);
    }

    if (role !== "ADMIN" && dentist.branchId !== branchId) {
      return sendError(res, "Dentist must be in your branch", 403);
    }

    // Verify xray user if provided
    if (xrayId) {
      const xray = await prisma.user.findUnique({
        where: { id: xrayId },
      });
      if (!xray || xray.role !== "XRAY") {
        return sendError(res, "Invalid X-Ray doctor", 400);
      }
    }

    // #region agent log
    debugLog({
      location: "appointment.controller.js:72",
      message: "before creating appointment",
      data: {
        patientId,
        dentistId,
        branchId: role === "ADMIN" ? dentist.branchId : branchId,
        date,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H1",
    });
    // #endregion

    const appointment = await prisma.appointment.create({
      data: {
        patientId, // REQUIRED - no longer nullable
        patientName: finalPatientName, // Use patient name from database
        branchId: role === "ADMIN" ? dentist.branchId : branchId,
        dentistId,
        xrayId: xrayId || null,
        receptionistId: role === "RECEPTION" ? userId : null,
        date: new Date(date),
        visitReason: visitReason || null,
        status: "PENDING",
      },
      include: {
        patient: true,
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        xray: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log sensitive action (non-blocking - don't fail if logging fails)
    logSensitiveAction(req, "CREATE_APPOINTMENT", {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      patientName: finalPatientName,
      dentistId: appointment.dentistId,
      branchId: appointment.branchId,
      date: appointment.date,
    }).catch((logError) => {
      console.error("Error logging create appointment action:", logError);
    });

    // #region agent log
    debugLog({
      location: "appointment.controller.js:194",
      message: "appointment created successfully",
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        status: appointment.status,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H1",
    });
    // #endregion

    return sendSuccess(
      res,
      appointment,
      201,
      "Appointment created successfully"
    );
  } catch (error) {
    // #region agent log
    debugLog({
      location: "appointment.controller.js:200",
      message: "appointment creation error",
      data: {
        errorMessage: error.message,
        errorName: error.name,
        requestBody: req.body,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H1",
    });
    // #endregion
    console.error("Create appointment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Get reception appointments
const getReceptionAppointments = async (req, res) => {
  try {
    const { branchId: userBranchId, role } = req.user;

    if (!req.user) {
      return sendError(res, "Unauthorized", 401);
    }

    const {
      branchId: queryBranchId,
      startDate,
      endDate,
      status,
      dentistId,
      patientName,
      limit = 100,
      skip = 0,
    } = req.query;

    // For ADMIN: use branchId from query params if provided, otherwise no filter
    // For RECEPTION: use their own branchId (ignore query param for security)
    let branchId;
    if (role === "ADMIN") {
      branchId = queryBranchId; // ADMIN must provide branchId in query params
    } else {
      branchId = userBranchId; // RECEPTION users can only see their own branch
    }

    const where = {};
    if (branchId) {
      where.branchId = branchId;
    } else if (role === "ADMIN") {
      // ADMIN must provide branchId - return empty if not provided
      return sendSuccess(res, []);
    } else if (role === "RECEPTION" && !branchId) {
      // RECEPTION must have a branchId - return error if missing
      return sendError(res, "Branch ID is required for reception users", 400);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    if (status) {
      where.status = status;
    }

    if (dentistId) {
      where.dentistId = dentistId;
    }

    if (patientName) {
      where.patientName = {
        contains: patientName,
        mode: "insensitive",
      };
    }

    // Get total count for pagination
    let total = 0;
    try {
      total = await prisma.appointment.count({ where });
      // #region agent log
      const fs = require("fs");
      const path = require("path");
      const projectRoot = path.resolve(__dirname, "../..");
      const logPath = path.join(projectRoot, ".cursor", "debug.log");
      const logEntry = JSON.stringify({
        location: "appointment.controller.js:303",
        message: "Appointment count query",
        data: {
          total,
          whereClause: JSON.stringify(where),
          hasDateFilter: !!(where.date),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
      // #endregion
    } catch (countError) {
      console.error("Error counting appointments:", countError);
      // If count fails, still try to fetch appointments
      total = 0;
    }

    // Calculate pagination
    const pageSize = parseInt(limit) || 20;
    const skipValue = parseInt(skip) || 0;
    const page = Math.floor(skipValue / pageSize) + 1;

    // Get all unique patient names from appointments without patient relation
    // Wrap in try-catch to prevent errors from breaking the main query
    let appointmentsWithoutPatient = [];
    try {
      appointmentsWithoutPatient = await prisma.appointment.findMany({
        where: {
          ...where,
          patientId: null,
        },
        select: {
          patientName: true,
        },
        distinct: ["patientName"],
      });
    } catch (patientQueryError) {
      console.error(
        "Error fetching appointments without patient:",
        patientQueryError
      );
      // Continue without patient lookup - not critical
      appointmentsWithoutPatient = [];
    }

    // Batch fetch patients by name (fix N+1 query)
    const patientNames = appointmentsWithoutPatient
      .map((apt) => apt.patientName)
      .filter(Boolean);
    const patientsByName = {};
    if (patientNames.length > 0) {
      const foundPatients = await prisma.patient.findMany({
        where: {
          name: {
            in: patientNames,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          cardNo: true,
          dateOfBirth: true,
          gender: true,
          address: true,
        },
      });

      // Create lookup map
      foundPatients.forEach((patient) => {
        patientsByName[patient.name.toLowerCase()] = patient;
      });
    }

    // Validate pagination values
    if (isNaN(pageSize) || pageSize < 1) {
      return sendError(res, "Invalid page size", 400);
    }
    if (isNaN(skipValue) || skipValue < 0) {
      return sendError(res, "Invalid skip value", 400);
    }

    let appointments = [];
    try {
      appointments = await prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          xray: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: pageSize,
        skip: skipValue,
      });
    } catch (queryError) {
      console.error("Error fetching appointments:", queryError);
      console.error("Query where clause:", JSON.stringify(where, null, 2));
      throw queryError; // Re-throw to be caught by outer try-catch
    }

    // Fix appointment statuses: Update PENDING appointments that have treatments to IN_PROGRESS
    const pendingAppointments = appointments.filter(
      (apt) => apt.status === "PENDING"
    );
    if (pendingAppointments.length > 0) {
      // Batch check which appointments have treatments
      const appointmentIds = pendingAppointments.map((apt) => apt.id);
      const appointmentsWithTreatments = await prisma.treatment.groupBy({
        by: ["appointmentId"],
        where: {
          appointmentId: { in: appointmentIds },
        },
      });
      const appointmentIdsWithTreatments = new Set(
        appointmentsWithTreatments.map((t) => t.appointmentId)
      );

      // Update appointments that have treatments but are still PENDING
      const updatePromises = pendingAppointments
        .filter((apt) => appointmentIdsWithTreatments.has(apt.id))
        .map(async (apt) => {
          try {
            await prisma.appointment.update({
              where: { id: apt.id },
              data: { status: "IN_PROGRESS" },
            });
            apt.status = "IN_PROGRESS"; // Update in response
          } catch (error) {
            // Don't fail the request if status update fails
            console.error(`Error fixing appointment ${apt.id} status:`, error);
          }
        });

      // Wait for all updates to complete (but don't block if some fail)
      await Promise.allSettled(updatePromises);
    }

    // Attach patient data for appointments without patient relation
    const appointmentsWithPatientData = appointments.map((apt) => {
      if (apt.patient) {
        return apt;
      }

      // If no patient relation but we have patientName, use lookup map
      if (apt.patientName) {
        const foundPatient =
          patientsByName[apt.patientName.toLowerCase()] || null;
        if (foundPatient) {
          apt.patient = foundPatient;
        }
      }

      return apt;
    });

    return sendPaginatedSuccess(
      res,
      appointmentsWithPatientData,
      { total, page, pageSize },
      200,
      "Appointments retrieved successfully"
    );
  } catch (error) {
    console.error("Get reception appointments error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return sendError(
      res,
      error.message || "Server error",
      500,
      process.env.NODE_ENV === "development" ? error : null
    );
  }
};

// Get dentist appointments
const getDentistAppointments = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { branchId } = req.query;

    const where = { dentistId: userId };
    if (branchId) {
      where.branchId = branchId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        branch: true,
        xray: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        xrayResult: true, // Include X-ray result with sentToDentist flag
        treatments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { date: "desc" },
    });

    // Apply backward compatibility transformation
    const transformedAppointments =
      transformAppointmentsForBackwardCompatibility(appointments);

    return sendSuccess(res, transformedAppointments);
  } catch (error) {
    console.error("Get dentist appointments error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Get X-ray appointments
const getXrayAppointments = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { branchId } = req.query;

    const where = { xrayId: userId };
    if (branchId) {
      where.branchId = branchId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    console.error("Get X-ray appointments error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id: userId, role, branchId } = req.user;
    const { id } = req.params;
    const { date, status, visitReason, xrayId, patientId, patientName, xrayType, urgency, notes } =
      req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    // Check permissions
    if (role === "RECEPTION" && appointment.branchId !== branchId) {
      return sendError(
        res,
        "You can only update appointments in your branch",
        403
      );
    }

    if (role === "DENTIST" && appointment.dentistId !== userId) {
      return sendError(res, "You can only update your own appointments", 403);
    }

    const updateData = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (status !== undefined) updateData.status = status;
    if (visitReason !== undefined) updateData.visitReason = visitReason;
    if (xrayId !== undefined) updateData.xrayId = xrayId || null;
    if (xrayType !== undefined) updateData.xrayType = xrayType || null;
    if (urgency !== undefined) updateData.urgency = urgency || null;
    if (notes !== undefined) updateData.notes = notes || null;

    // Handle patientId update - must be valid UUID and patient must exist
    if (patientId !== undefined) {
      if (!patientId) {
        return sendError(
          res,
          "Patient ID cannot be null. Every appointment must be linked to a patient.",
          400
        );
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return sendError(res, "Patient not found", 404);
      }

      updateData.patientId = patientId;
      // Update patientName from patient record if not provided
      updateData.patientName = patientName || patient.name;
    } else if (patientName !== undefined) {
      // If only patientName is provided, update it (but keep existing patientId)
      updateData.patientName = patientName;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        xray: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      updatedAppointment,
      200,
      "Appointment updated successfully"
    );
  } catch (error) {
    console.error("Update appointment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Get patient appointments with sequence
const getPatientAppointmentsWithSequence = async (req, res) => {
  try {
    const { patientId } = req.params;

    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
          },
        },
        treatments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { date: "asc" },
    });

    // Add sequence numbers
    const appointmentsWithSequence = appointments.map((apt, index) => ({
      ...apt,
      sequence: index + 1,
    }));

    return sendSuccess(res, appointmentsWithSequence);
  } catch (error) {
    console.error("Get patient appointments with sequence error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Get appointment statistics
const getAppointmentStats = async (req, res) => {
  try {
    const { branchId: userBranchId, role } = req.user;
    const { branchId: queryBranchId, startDate, endDate } = req.query;

    // For ADMIN: use branchId from query params if provided
    // For RECEPTION: use their own branchId
    let branchId;
    if (role === "ADMIN") {
      branchId = queryBranchId;
    } else {
      branchId = userBranchId;
    }

    if (!branchId && role !== "ADMIN") {
      return sendError(res, "Branch ID is required", 400);
    }

    const where = {};
    if (branchId) {
      where.branchId = branchId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    // Get all appointments for stats calculation
    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        date: true,
        status: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = {
      total: appointments.length,
      today: appointments.filter(
        (apt) => new Date(apt.date) >= today && new Date(apt.date) < tomorrow
      ).length,
      pending: appointments.filter((apt) => apt.status === "PENDING").length,
      completed: appointments.filter((apt) => apt.status === "COMPLETED")
        .length,
      cancelled: appointments.filter((apt) => apt.status === "CANCELLED")
        .length,
      inProgress: appointments.filter((apt) => apt.status === "IN_PROGRESS")
        .length,
      cancellationRate:
        appointments.length > 0
          ? (
              (appointments.filter((apt) => apt.status === "CANCELLED").length /
                appointments.length) *
              100
            ).toFixed(2)
          : 0,
    };

    return sendSuccess(res, stats);
  } catch (error) {
    console.error("Get appointment stats error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { id: appointmentId } = req.params;
    const { date, time, reason } = req.body;
    const { id: userId, role, branchId } = req.user;

    if (!date || !time) {
      return sendError(res, "Date and time are required", 400);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    // Check permissions
    if (role === "RECEPTION" && appointment.branchId !== branchId) {
      return sendError(
        res,
        "You can only reschedule appointments in your branch",
        403
      );
    }

    const newDateTime = new Date(`${date}T${time}`);

    // Check for conflicts
    const conflicts = await prisma.appointment.findMany({
      where: {
        id: { not: appointmentId },
        dentistId: appointment.dentistId,
        date: {
          gte: new Date(newDateTime.getTime() - 60 * 60 * 1000), // 1 hour before
          lte: new Date(newDateTime.getTime() + 60 * 60 * 1000), // 1 hour after
        },
        status: { not: "CANCELLED" },
      },
    });

    if (conflicts.length > 0) {
      return sendError(
        res,
        "Time slot conflicts with existing appointment",
        409
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: newDateTime,
        visitReason: reason || appointment.visitReason,
      },
      include: {
        patient: true,
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log sensitive action (non-blocking - don't fail if logging fails)
    logSensitiveAction(req, "RESCHEDULE_APPOINTMENT", {
      appointmentId: appointmentId,
      oldDate: appointment.date,
      newDate: newDateTime,
      reason: reason,
    }).catch((logError) => {
      console.error("Error logging reschedule action:", logError);
      // Don't throw - logging failure shouldn't break the request
    });

    return sendSuccess(
      res,
      updatedAppointment,
      200,
      "Appointment rescheduled successfully"
    );
  } catch (error) {
    console.error("Reschedule appointment error:", error);
    console.error("Error stack:", error.stack);
    return sendError(
      res,
      error.message || "Server error",
      500,
      process.env.NODE_ENV === "development" ? error : null
    );
  }
};

// Check in patient
const checkInAppointment = async (req, res) => {
  try {
    const { id: appointmentId } = req.params;
    const { id: userId, role, branchId } = req.user;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    // Check permissions
    if (role === "RECEPTION" && appointment.branchId !== branchId) {
      return sendError(
        res,
        "You can only check in patients in your branch",
        403
      );
    }

    // Update appointment status to IN_PROGRESS
    // Note: checkedInAt and checkedInBy fields don't exist in schema yet
    // Using updatedAt to track when check-in occurred
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "IN_PROGRESS",
        // updatedAt will be automatically set by Prisma
      },
      include: {
        patient: true,
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log sensitive action (non-blocking - don't fail if logging fails)
    logSensitiveAction(req, "CHECKIN_APPOINTMENT", {
      appointmentId: appointmentId,
      patientId: appointment.patientId,
      checkedInAt: updatedAppointment.updatedAt, // Use updatedAt as check-in timestamp
      checkedInBy: userId,
    }).catch((logError) => {
      console.error("Error logging check-in action:", logError);
      // Don't throw - logging failure shouldn't break the request
    });

    return sendSuccess(
      res,
      updatedAppointment,
      200,
      "Patient checked in successfully"
    );
  } catch (error) {
    console.error("Check in appointment error:", error);
    console.error("Error stack:", error.stack);
    return sendError(
      res,
      error.message || "Server error",
      500,
      process.env.NODE_ENV === "development" ? error : null
    );
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id: appointmentId } = req.params;
    const { reason } = req.body;
    const { id: userId, role, branchId } = req.user;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    // Check permissions
    if (role === "RECEPTION" && appointment.branchId !== branchId) {
      return sendError(
        res,
        "You can only cancel appointments in your branch",
        403
      );
    }

    // Update appointment status to CANCELLED
    // Note: cancelledAt, cancelledBy, and cancellationReason fields don't exist in schema yet
    // Using updatedAt to track when cancellation occurred
    // Store cancellation reason in visitReason if provided
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        // Store cancellation reason in visitReason if provided
        // Note: This will overwrite existing visitReason, but it's the only text field available
        visitReason: reason
          ? `CANCELLED: ${reason}`
          : appointment.visitReason || null,
        // updatedAt will be automatically set by Prisma
      },
      include: {
        patient: true,
        branch: true,
        dentist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log sensitive action (non-blocking - don't fail if logging fails)
    logSensitiveAction(req, "CANCEL_APPOINTMENT", {
      appointmentId: appointmentId,
      patientId: appointment.patientId,
      reason: reason,
      cancelledAt: updatedAppointment.updatedAt, // Use updatedAt as cancellation timestamp
      cancelledBy: userId,
    }).catch((logError) => {
      console.error("Error logging cancel appointment action:", logError);
    });

    return sendSuccess(
      res,
      updatedAppointment,
      200,
      "Appointment cancelled successfully"
    );
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Bulk operations on appointments
const bulkAppointmentOperations = async (req, res) => {
  try {
    const { appointmentIds, operation, data } = req.body;
    const { id: userId, role, branchId } = req.user;

    if (
      !appointmentIds ||
      !Array.isArray(appointmentIds) ||
      appointmentIds.length === 0
    ) {
      return sendError(res, "Appointment IDs are required", 400);
    }

    if (!operation) {
      return sendError(res, "Operation is required", 400);
    }

    // Get appointments to check permissions
    const appointments = await prisma.appointment.findMany({
      where: {
        id: { in: appointmentIds },
      },
    });

    // Check permissions
    if (role === "RECEPTION") {
      const invalidAppointments = appointments.filter(
        (apt) => apt.branchId !== branchId
      );
      if (invalidAppointments.length > 0) {
        return sendError(
          res,
          "You can only perform operations on appointments in your branch",
          403
        );
      }
    }

    let result;

    switch (operation) {
      case "cancel":
        // Note: cancelledAt, cancelledBy, and cancellationReason fields don't exist in schema yet
        result = await prisma.appointment.updateMany({
          where: {
            id: { in: appointmentIds },
          },
          data: {
            status: "CANCELLED",
            // Store cancellation reason in visitReason if provided
            visitReason: data?.reason ? `CANCELLED: ${data.reason}` : undefined,
          },
        });
        break;

      case "reschedule":
        if (!data?.date || !data?.time) {
          return sendError(
            res,
            "Date and time are required for rescheduling",
            400
          );
        }
        const newDateTime = new Date(`${data.date}T${data.time}`);
        // Update each appointment individually to handle conflicts
        const updatePromises = appointmentIds.map((id) =>
          prisma.appointment.update({
            where: { id },
            data: {
              date: newDateTime,
              visitReason: data.reason || undefined,
            },
          })
        );
        await Promise.all(updatePromises);
        result = { count: appointmentIds.length };
        break;

      default:
        return sendError(res, "Invalid operation", 400);
    }

    return sendSuccess(
      res,
      { affected: result.count || appointmentIds.length },
      200,
      `Bulk ${operation} completed successfully`
    );
  } catch (error) {
    console.error("Bulk appointment operations error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  createAppointment,
  getReceptionAppointments,
  getDentistAppointments,
  getXrayAppointments,
  updateAppointment,
  getPatientAppointmentsWithSequence,
  getAppointmentStats,
  rescheduleAppointment,
  checkInAppointment,
  cancelAppointment,
  bulkAppointmentOperations,
};

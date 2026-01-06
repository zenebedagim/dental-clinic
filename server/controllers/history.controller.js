const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

const searchPatientHistory = async (req, res) => {
  try {
    const { name, branchId } = req.query;
    const { role, id: userId } = req.user;

    if (!name || name.trim() === "") {
      return sendSuccess(res, []);
    }

    const searchTerm = name.trim();
    const where = {
      patientName: {
        contains: searchTerm,
        mode: "insensitive",
      },
    };

    // Filter by branch if provided - always show all patient data per branch regardless of role
    if (branchId) {
      where.branchId = branchId;
    }

    // No role-based filtering - always display all patient data per branch

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
        treatments: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only the most recent treatment
        },
        xrayResult: {
          include: {
            images: {
              orderBy: { uploadedAt: "asc" },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Transform for backward compatibility - add 'treatment' field from most recent treatment
    const appointmentsWithTreatment = appointments.map((appointment) => {
      const transformed = { ...appointment };
      if (transformed.treatments && Array.isArray(transformed.treatments)) {
        transformed.treatment = transformed.treatments.length > 0 ? transformed.treatments[0] : null;
      }
      return transformed;
    });

    // Format results for unified history display
    const history = appointmentsWithTreatment.map((appointment) => ({
      id: appointment.id,
      type: "Appointment",
      patientName: appointment.patientName,
      branch: appointment.branch,
      date: appointment.date,
      status: appointment.status,
      dentist: appointment.dentist,
      xray: appointment.xray,
      treatment: appointment.treatment
        ? {
            id: appointment.treatment.id,
            diagnosis: appointment.treatment.diagnosis,
            treatmentPlan: appointment.treatment.treatmentPlan,
            status: appointment.treatment.status,
          }
        : null,
      xrayResult: appointment.xrayResult
        ? {
            id: appointment.xrayResult.id,
            result: appointment.xrayResult.result,
            imageUrl: appointment.xrayResult.imageUrl,
            sentToDentist: appointment.xrayResult.sentToDentist,
            images: appointment.xrayResult.images || [],
            xrayType: appointment.xrayResult.xrayType,
            createdAt: appointment.xrayResult.createdAt,
            updatedAt: appointment.xrayResult.updatedAt,
          }
        : null,
      createdAt: appointment.createdAt,
    }));

    return sendSuccess(res, history);
  } catch (error) {
    console.error("Search patient history error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get full patient history by patient ID
 */
const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { branchId } = req.query;
    const { role, id: userId } = req.user;

    if (!patientId) {
      return sendError(res, "Patient ID is required", 400);
    }

    const where = {
      patientId: patientId,
    };

    // Filter by branch if provided - always show all patient data per branch regardless of role
    if (branchId) {
      where.branchId = branchId;
    }

    // No role-based filtering - always display all patient data per branch

    // #region agent log
    const fs = require("fs");
    const path = require("path");
    const debugLog = (data) => {
      try {
        const projectRoot = path.resolve(__dirname, "../..");
        const logPath = path.join(projectRoot, ".cursor", "debug.log");
        const logEntry = JSON.stringify(data) + "\n";
        fs.appendFileSync(logPath, logEntry, "utf8");
      } catch (err) {
        console.error("Debug log error:", err.message);
      }
    };
    debugLog({
      location: "history.controller.js:141",
      message: "before fetching appointments",
      data: {
        patientId,
        branchId,
        whereClause: where,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H3",
    });
    // #endregion

    // Get all appointments for this patient, ordered by date (oldest first) for sequence calculation
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
        treatments: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only the most recent treatment for display
        },
        xrayResult: {
          include: {
            images: {
              orderBy: { uploadedAt: "asc" },
            },
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            gender: true,
            dateOfBirth: true,
            address: true,
            cardNo: true,
          },
        },
      },
      orderBy: { date: "asc" }, // Oldest first to calculate sequence numbers
    });

    // #region agent log
    debugLog({
      location: "history.controller.js:190",
      message: "appointments fetched",
      data: {
        appointmentsCount: appointments.length,
        sampleAppointments: appointments.slice(0, 3).map(apt => ({
          id: apt.id,
          date: apt.date,
          patientName: apt.patientName,
          branchId: apt.branchId,
        })),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H3",
    });
    // #endregion

    // Transform for backward compatibility - add 'treatment' field from most recent treatment
    const appointmentsWithTreatment = appointments.map((appointment) => {
      const transformed = { ...appointment };
      if (transformed.treatments && Array.isArray(transformed.treatments)) {
        transformed.treatment = transformed.treatments.length > 0 ? transformed.treatments[0] : null;
      }
      return transformed;
    });

    // Add treatment sequence numbers to appointments
    const appointmentsWithSequence = appointmentsWithTreatment.map((appointment, index) => ({
      ...appointment,
      treatmentNumber: index + 1,
      treatmentSequence: getOrdinalNumber(index + 1),
    }));

    // Get all treatments for this patient (ordered by appointment date, then creation date - chronological order)
    const treatmentsRaw = await prisma.treatment.findMany({
      where: {
        appointment: {
          patientId: patientId,
          ...(branchId ? { branchId } : {}),
        },
      },
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            patientName: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { appointment: { date: "asc" } }, // Order by appointment date first (chronological - oldest first)
        { createdAt: "asc" }, // Then by creation date (oldest first)
      ],
    });

    // Add sequence numbers to treatments (1st, 2nd, 3rd, etc.)
    const treatments = treatmentsRaw.map((treatment, index) => ({
      ...treatment,
      treatmentNumber: index + 1,
      treatmentSequence: getOrdinalNumber(index + 1),
    }));

    // Get all X-ray results for this patient
    // X-Rays are linked through appointments, so we query via appointment.patientId
    const xrayResults = await prisma.xRay.findMany({
      where: {
        appointment: {
          patientId: patientId,
          ...(branchId ? { branchId } : {}),
        },
      },
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            patientName: true,
            branchId: true,
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        images: {
          orderBy: { uploadedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get payments from Payment table (not derived from appointments)
    const paymentsRaw = await prisma.payment.findMany({
      where: {
        appointment: {
          patientId: patientId,
          ...(branchId ? { branchId } : {}),
        },
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
              select: {
                id: true,
                totalCost: true,
                procedureLogs: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform payments to match frontend format
    const payments = paymentsRaw.map((payment) => {
      const treatment = payment.appointment.treatments && payment.appointment.treatments.length > 0
        ? payment.appointment.treatments[0]
        : null;

        return {
        id: payment.id,
        appointmentId: payment.appointmentId,
        patientName: payment.appointment.patientName || payment.appointment.patient?.name || "N/A",
        patient: payment.appointment.patient,
        date: payment.appointment.date || payment.paymentDate,
        dentist: payment.appointment.dentist?.name || "N/A",
        treatment: treatment,
        amount: payment.amount,
        paidAmount: payment.paidAmount,
        paymentStatus: payment.paymentStatus,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        showDetailedBilling: payment.showDetailedBilling || false,
        isHidden: payment.isHidden || false,
        appointment: payment.appointment,
      };
    });

    // Get patient information to include in response
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        cardNo: true,
      },
    });

    // #region agent log
    debugLog({
      location: "history.controller.js:356",
      message: "returning patient history",
      data: {
        patientId,
        patientName: patient?.name,
        appointmentsCount: appointmentsWithSequence.length,
        treatmentsCount: treatments.length,
        sampleAppointmentPatientNames: appointmentsWithSequence.slice(0, 3).map(apt => apt.patientName),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "H3",
    });
    // #endregion

    return sendSuccess(res, {
      appointments: appointmentsWithSequence, // Include sequence numbers
      treatments,
      xrayResults,
      payments,
      patient, // Include patient information
    });
  } catch (error) {
    console.error("Get patient history error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Helper function to convert number to ordinal (1 -> "First", 2 -> "Second", etc.)
 */
const getOrdinalNumber = (num) => {
  const ordinals = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth",
    "Eleventh",
    "Twelfth",
    "Thirteenth",
    "Fourteenth",
    "Fifteenth",
    "Sixteenth",
    "Seventeenth",
    "Eighteenth",
    "Nineteenth",
    "Twentieth",
  ];

  if (num <= 20) {
    return ordinals[num - 1];
  }

  // For numbers > 20, use numeric format
  return `${num}th`;
};

module.exports = { searchPatientHistory, getPatientHistory };

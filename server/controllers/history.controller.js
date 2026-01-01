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
        treatment: true,
        xrayResult: true,
      },
      orderBy: { date: "desc" },
    });

    // Format results for unified history display
    const history = appointments.map((appointment) => ({
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
        treatment: true,
        xrayResult: true,
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

    // Add treatment sequence numbers to appointments
    const appointmentsWithSequence = appointments.map((appointment, index) => ({
      ...appointment,
      treatmentNumber: index + 1,
      treatmentSequence: getOrdinalNumber(index + 1),
    }));

    // Get all treatments for this patient
    const treatments = await prisma.treatment.findMany({
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all X-ray results for this patient
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get payments (derived from completed appointments with treatments)
    // Payments are represented as completed appointments with treatments
    const payments = appointmentsWithSequence
      .filter(
        (apt) =>
          apt.status === "COMPLETED" &&
          apt.treatment &&
          apt.treatment.status === "COMPLETED"
      )
      .map((apt) => {
        // Calculate total cost from treatment procedureLogs if available
        let amount = 0;
        if (apt.treatment?.procedureLogs && Array.isArray(apt.treatment.procedureLogs)) {
          amount = apt.treatment.procedureLogs.reduce((sum, proc) => {
            return sum + (proc.cost || 0);
          }, 0);
        } else if (apt.treatment?.totalCost) {
          amount = apt.treatment.totalCost;
        }

        return {
          id: apt.id,
          date: apt.date,
          amount: amount,
          status: "PAID", // Assume paid if treatment is completed
          appointmentId: apt.id,
          treatment: apt.treatment,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return sendSuccess(res, {
      appointments: appointmentsWithSequence, // Include sequence numbers
      treatments,
      xrayResults,
      payments,
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

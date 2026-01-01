const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

const createAppointment = async (req, res) => {
  try {
      const {
      patientId,
      patientName,
      gender,
      phoneNumber,
      address,
      cardNo,
      branchId,
      dentistId,
      xrayId,
      date,
      visitReason,
    } = req.body;

    // Require either patientId or patientName for backward compatibility
    if (!patientId && !patientName) {
      return sendError(res, "Patient ID or patient name is required", 400);
    }

    if (!branchId || !dentistId || !date) {
      return sendError(res, "Branch, dentist, and date are required", 400);
    }

    // Validate branch exists and is active
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return sendError(res, "Branch not found", 404);
    }

    // Validate dentist exists and check if they belong to the selected branch
    const dentist = await prisma.user.findUnique({
      where: { id: dentistId },
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
      },
    });

    if (!dentist) {
      return sendError(res, "Dentist not found", 404);
    }

    if (dentist.role !== "DENTIST") {
      return sendError(res, "Selected user is not a dentist", 400);
    }

    // Validate dentist belongs to the selected branch
    if (dentist.branchId !== branchId) {
      return sendError(
        res,
        "Selected dentist does not belong to the selected branch",
        400
      );
    }

    // Check doctor availability (if schedule system is being used)
    try {
      const appointmentDate = new Date(date);
      const dayOfWeek = appointmentDate.getDay();
      const dateStart = new Date(appointmentDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);

      // Get schedule for this day
      const schedule = await prisma.doctorSchedule
        .findUnique({
          where: {
            doctorId_branchId_dayOfWeek: {
              doctorId: dentistId,
              branchId: branchId,
              dayOfWeek: dayOfWeek,
            },
          },
        })
        .catch(() => null);

      // Check for availability override
      const availabilityOverride = await prisma.doctorAvailability
        .findFirst({
          where: {
            doctorId: dentistId,
            date: {
              gte: dateStart,
              lt: dateEnd,
            },
          },
        })
        .catch(() => null);

      // Check if blocked
      if (availabilityOverride && !availabilityOverride.isAvailable) {
        return sendError(
          res,
          `Doctor is not available on this date. Reason: ${
            availabilityOverride.reason || "Not specified"
          }`,
          400
        );
      }

      // Check if no schedule exists but availability override allows it
      if (!schedule && !availabilityOverride) {
        // Warning: Doctor has no schedule set, but we'll allow it for backward compatibility
        console.warn(
          `Doctor ${dentistId} has no schedule set for day ${dayOfWeek}`
        );
      } else if (schedule && !schedule.isAvailable) {
        return sendError(
          res,
          "Doctor is not available on this day of the week",
          400
        );
      }

      // Check for conflicting appointments
      const appointmentEndTime = new Date(
        appointmentDate.getTime() + 60 * 60 * 1000
      ); // Default 1 hour duration
      const conflictingAppointments = await prisma.appointment
        .findFirst({
          where: {
            dentistId: dentistId,
            branchId: branchId,
            date: {
              gte: appointmentDate,
              lt: appointmentEndTime,
            },
            status: {
              not: "COMPLETED",
            },
          },
        })
        .catch(() => null);

      if (conflictingAppointments) {
        return sendError(
          res,
          "Doctor already has an appointment at this time",
          400
        );
      }
    } catch (availabilityError) {
      // If availability check fails, log but don't block appointment creation
      // This allows backward compatibility if schedules aren't set up yet
      console.warn(
        "Availability check failed, allowing appointment:",
        availabilityError.message
      );
    }

    // Handle patient creation/retrieval
    let finalPatientName = patientName;
    let finalPatientId = patientId || null;

    if (patientId) {
      // Existing patient - fetch patient name
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { name: true },
      });

      if (!patient) {
        return sendError(res, "Patient not found", 404);
      }

      finalPatientName = patient.name;
    } else if (patientName) {
      // New patient - create patient record with provided details
      // Check if patient already exists by phone number (if provided)
      if (phoneNumber) {
        const existingPatient = await prisma.patient.findFirst({
          where: {
            phone: phoneNumber,
            name: {
              equals: patientName,
              mode: "insensitive",
            },
          },
        });

        if (existingPatient) {
          // Use existing patient
          finalPatientId = existingPatient.id;
          finalPatientName = existingPatient.name;
        } else {
          // Create new patient
          const newPatient = await prisma.patient.create({
            data: {
              name: patientName,
              phone: phoneNumber || null,
              email: null, // Can be added later
              gender: gender || null,
              address: address || null,
              cardNo: req.body.cardNo || null,
            },
          });
          finalPatientId = newPatient.id;
          finalPatientName = newPatient.name;
        }
      } else {
        // No phone number - create new patient without duplicate check
        const newPatient = await prisma.patient.create({
          data: {
            name: patientName,
            phone: null,
            email: null,
            gender: gender || null,
            address: address || null,
            cardNo: req.body.cardNo || null,
          },
        });
        finalPatientId = newPatient.id;
        finalPatientName = newPatient.name;
      }
    }

    // Set receptionistId if the user creating the appointment is a receptionist
    const receptionistId = req.user.role === "RECEPTION" ? req.user.id : null;

    const appointment = await prisma.appointment.create({
      data: {
        patientId: finalPatientId,
        patientName: finalPatientName,
        branchId,
        dentistId,
        xrayId: xrayId || null,
        receptionistId: receptionistId,
        date: new Date(date),
        status: "PENDING",
        visitReason: visitReason || null,
      },
      include: {
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
        receptionist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify assigned dentist about new appointment
    try {
      const notificationService = require('../services/notification.service');
      const { NotificationType } = require('../utils/notificationTypes');
      
      await notificationService.notifyUser(appointment.dentistId, {
        type: NotificationType.APPOINTMENT_CREATED,
        title: 'New Appointment',
        message: `New appointment scheduled for ${appointment.patientName} on ${new Date(appointment.date).toLocaleString()}`,
        data: {
          appointmentId: appointment.id,
          patientName: appointment.patientName,
          date: appointment.date,
        },
      });
    } catch (notifError) {
      console.error('Error sending appointment creation notification:', notifError);
      // Don't fail the request if notification fails
    }

    return sendSuccess(
      res,
      appointment,
      201,
      "Appointment created successfully"
    );
  } catch (error) {
    console.error("Create appointment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getReceptionAppointments = async (req, res) => {
  try {
    console.log("=== getReceptionAppointments Request ===");
    console.log("Query params:", JSON.stringify(req.query, null, 2));
    console.log("User branchId:", req.user?.branchId);
    
    const {
      branchId: selectedBranchId,
      startDate,
      endDate,
      status,
      dentistId,
      patientName,
      patientPhone,
      limit,
      skip,
    } = req.query;
    const branchId = selectedBranchId || req.user.branchId;

    if (!branchId) {
      return sendError(res, "Branch ID is required", 400);
    }

    // Build date filter - only apply if dates are provided (show all by default)
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = {
        date: {
          gte: start,
          lte: end,
        },
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateFilter = {
        date: {
          gte: start,
        },
      };
    }
    // No default date filter - show all appointments by default

    // Build where clause - Receptionists see ALL appointments in their branch
    const where = {
      branchId, // Only filter by branch - show all appointments in this branch
      ...dateFilter,
    };

    // Add status filter if provided
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Add dentist filter if provided
    if (dentistId) {
      where.dentistId = dentistId;
    }

    // Add patient name filter if provided
    if (patientName) {
      where.patientName = {
        contains: patientName,
        mode: "insensitive",
      };
    }

    // Add patient phone filter if provided (filter by patient relation)
    if (patientPhone) {
      where.patient = {
        phone: {
          contains: patientPhone,
        },
      };
    }

    // Parse pagination parameters for slow network optimization
    // Default limit to prevent loading too much data at once
    const take = limit ? parseInt(limit, 10) : 100;
    const skipValue = skip ? parseInt(skip, 10) : undefined;

    const appointments = await prisma.appointment.findMany({
      where,
      take, // Limit results for pagination (default 100)
      skip: skipValue, // Skip results for pagination
      orderBy: { date: "desc" }, // Most recent first
      include: {
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
        receptionist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Optimize treatment include - only fetch necessary fields
        treatment: {
          select: {
            id: true,
            totalCost: true,
          },
        },
        // Optimize xrayResult include - only fetch necessary fields
        xrayResult: {
          select: {
            id: true,
            xrayType: true,
            findings: true,
            createdAt: true,
          },
        },
      },
    });

    console.log("=== getReceptionAppointments Success ===");
    console.log(`Returning ${appointments.length} appointments`);
    
    console.log("=== getReceptionAppointments Success ===");
    console.log(`Returning ${appointments.length} appointments`);
    
    return sendSuccess(res, appointments);
  } catch (error) {
    console.error("=== getReceptionAppointments Error ===");
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

const getDentistAppointments = async (req, res) => {
  try {
    const { id: dentistId } = req.user;
    const { branchId: selectedBranchId } = req.query;

    // Require branchId - dentists work within branches
    const branchId = selectedBranchId || req.user.branchId;

    if (!branchId) {
      return sendError(res, "Branch ID is required", 400);
    }

    // Filter by branch first, then by dentist - ensures dentists see their appointments in the selected branch
    const where = {
      branchId,
      dentistId,
    };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
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
        treatment: true,
        xrayResult: true,
      },
      orderBy: { date: "desc" },
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    console.error("Get dentist appointments error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getXrayAppointments = async (req, res) => {
  try {
    const { id: xrayId } = req.user;
    const { branchId: selectedBranchId } = req.query;

    // Require branchId - XRAY doctors work within branches
    const branchId = selectedBranchId || req.user.branchId;

    if (!branchId) {
      return sendError(res, "Branch ID is required", 400);
    }

    // Filter by branch first, then by XRAY doctor - ensures XRAY doctors see their appointments in the selected branch
    const where = {
      branchId,
      xrayId,
    };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
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
        xrayResult: true,
      },
      orderBy: { date: "desc" },
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    console.error("Get xray appointments error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Update appointment
 */
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, dentistId, xrayId, status, visitReason } = req.body;
    const { id: userId, role } = req.user;

    // Check if appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        branch: true,
        dentist: true,
      },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    // Build update data
    const updateData = {};
    if (date) {
      const appointmentDate = new Date(date);

      // Check for conflicts if date is being changed
      if (appointment.date.getTime() !== appointmentDate.getTime()) {
        const appointmentEndTime = new Date(
          appointmentDate.getTime() + 60 * 60 * 1000
        ); // Default 1 hour duration

        const conflictingAppointments = await prisma.appointment.findFirst({
          where: {
            id: { not: id }, // Exclude current appointment
            dentistId: dentistId || appointment.dentistId,
            branchId: appointment.branchId,
            date: {
              gte: appointmentDate,
              lt: appointmentEndTime,
            },
            status: {
              not: "COMPLETED",
            },
          },
        });

        if (conflictingAppointments) {
          return sendError(
            res,
            "Doctor already has an appointment at this time",
            400
          );
        }

        // Check doctor availability
        const dayOfWeek = appointmentDate.getDay();
        const dateStart = new Date(appointmentDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(dateStart);
        dateEnd.setDate(dateEnd.getDate() + 1);

        const schedule = await prisma.doctorSchedule
          .findUnique({
            where: {
              doctorId_branchId_dayOfWeek: {
                doctorId: dentistId || appointment.dentistId,
                branchId: appointment.branchId,
                dayOfWeek: dayOfWeek,
              },
            },
          })
          .catch(() => null);

        const availabilityOverride = await prisma.doctorAvailability
          .findFirst({
            where: {
              doctorId: dentistId || appointment.dentistId,
              date: {
                gte: dateStart,
                lt: dateEnd,
              },
            },
          })
          .catch(() => null);

        if (availabilityOverride && !availabilityOverride.isAvailable) {
          return sendError(
            res,
            `Doctor is not available on this date. Reason: ${
              availabilityOverride.reason || "Not specified"
            }`,
            400
          );
        }

        if (schedule && !schedule.isAvailable) {
          return sendError(
            res,
            "Doctor is not available on this day of the week",
            400
          );
        }
      }

      updateData.date = appointmentDate;
    }
    if (dentistId) {
      // Validate dentist exists and belongs to the appointment's branch
      const dentist = await prisma.user.findUnique({
        where: { id: dentistId },
        select: {
          id: true,
          name: true,
          role: true,
          branchId: true,
        },
      });

      if (!dentist) {
        return sendError(res, "Dentist not found", 404);
      }

      if (dentist.role !== "DENTIST") {
        return sendError(res, "Selected user is not a dentist", 400);
      }

      // Validate dentist belongs to the appointment's branch
      if (dentist.branchId !== appointment.branchId) {
        return sendError(
          res,
          "Selected dentist does not belong to this appointment's branch",
          400
        );
      }

      updateData.dentistId = dentistId;
    }
    if (xrayId !== undefined) updateData.xrayId = xrayId || null;
    if (status) updateData.status = status;
    if (visitReason !== undefined) updateData.visitReason = visitReason || null;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
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
        treatment: true,
        xrayResult: true,
        receptionist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notifications based on what changed
    try {
      const notificationService = require('../services/notification.service');
      const { NotificationType, NotificationPriority } = require('../utils/notificationTypes');
      
      // If status changed to CANCELLED, notify both dentist and reception
      if (status === 'CANCELLED') {
        await Promise.all([
          notificationService.notifyUser(updatedAppointment.dentistId, {
            type: NotificationType.APPOINTMENT_CANCELLED,
            priority: NotificationPriority.CRITICAL,
            title: 'Appointment Cancelled',
            message: `Appointment for ${updatedAppointment.patientName} has been cancelled`,
            data: {
              appointmentId: updatedAppointment.id,
              patientName: updatedAppointment.patientName,
            },
          }),
          updatedAppointment.receptionistId && notificationService.notifyUser(updatedAppointment.receptionistId, {
            type: NotificationType.APPOINTMENT_CANCELLED,
            priority: NotificationPriority.CRITICAL,
            title: 'Appointment Cancelled',
            message: `Appointment for ${updatedAppointment.patientName} has been cancelled`,
            data: {
              appointmentId: updatedAppointment.id,
              patientName: updatedAppointment.patientName,
            },
          }),
        ]);
      } else if (status) {
        // Status changed (but not cancelled)
        await notificationService.notifyUser(updatedAppointment.dentistId, {
          type: NotificationType.APPOINTMENT_UPDATED,
          title: 'Appointment Updated',
          message: `Appointment for ${updatedAppointment.patientName} status changed to ${status}`,
          data: {
            appointmentId: updatedAppointment.id,
            patientName: updatedAppointment.patientName,
            status,
          },
        });
        
        // Also notify reception if status changed by dentist
        if (updatedAppointment.receptionistId && req.user.role === 'DENTIST') {
          await notificationService.notifyUser(updatedAppointment.receptionistId, {
            type: NotificationType.APPOINTMENT_UPDATED,
            title: 'Appointment Status Updated',
            message: `Appointment for ${updatedAppointment.patientName} status changed to ${status}`,
            data: {
              appointmentId: updatedAppointment.id,
              patientName: updatedAppointment.patientName,
              status,
            },
          });
        }
      }
    } catch (notifError) {
      console.error('Error sending appointment update notification:', notifError);
      // Don't fail the request if notification fails
    }

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

/**
 * Get patient appointments with treatment sequence numbers (first, second, third, etc.)
 * Orders appointments by date (oldest first) and adds treatmentNumber to each
 */
const getPatientAppointmentsWithSequence = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { branchId: selectedBranchId } = req.query;
    const branchId = selectedBranchId || req.user.branchId;

    if (!patientId) {
      return sendError(res, "Patient ID is required", 400);
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true },
    });

    if (!patient) {
      return sendError(res, "Patient not found", 404);
    }

    // Build where clause
    const where = {
      patientId: patientId,
    };

    // Filter by branch if provided
    if (branchId) {
      where.branchId = branchId;
    }

    // Get all appointments for this patient, ordered by date (oldest first)
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
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
      orderBy: { date: "asc" }, // Oldest first to determine sequence
    });

    // Add treatment sequence number to each appointment
    const appointmentsWithSequence = appointments.map((appointment, index) => ({
      ...appointment,
      treatmentNumber: index + 1, // 1st, 2nd, 3rd, etc.
      treatmentSequence: getOrdinalNumber(index + 1), // "First", "Second", "Third", etc.
    }));

    return sendSuccess(
      res,
      {
        patient: {
          id: patient.id,
          name: patient.name,
        },
        totalAppointments: appointmentsWithSequence.length,
        appointments: appointmentsWithSequence,
      },
      200,
      "Patient appointments retrieved successfully"
    );
  } catch (error) {
    console.error("Get patient appointments with sequence error:", error);
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

module.exports = {
  createAppointment,
  getReceptionAppointments,
  getDentistAppointments,
  getXrayAppointments,
  updateAppointment,
  getPatientAppointmentsWithSequence,
};

const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

/**
 * Create or update doctor schedule
 */
const createOrUpdateSchedule = async (req, res) => {
  try {
    const {
      doctorId,
      branchId,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable = true,
    } = req.body;

    // Verify doctor exists and is a DENTIST
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return sendError(res, "Doctor not found", 404);
    }

    if (doctor.role !== "DENTIST") {
      return sendError(res, "User is not a dentist", 400);
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return sendError(res, "Branch not found", 404);
    }

    // Create or update schedule (upsert)
    const schedule = await prisma.doctorSchedule.upsert({
      where: {
        doctorId_branchId_dayOfWeek: {
          doctorId,
          branchId,
          dayOfWeek: parseInt(dayOfWeek),
        },
      },
      update: {
        startTime,
        endTime,
        isAvailable,
      },
      create: {
        doctorId,
        branchId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        isAvailable,
      },
      include: {
        doctor: {
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
            code: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      schedule,
      201,
      "Schedule created/updated successfully"
    );
  } catch (error) {
    console.error("Create/update schedule error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get schedules for a doctor or branch
 */
const getSchedules = async (req, res) => {
  try {
    const { doctorId, branchId } = req.query;

    const where = {};
    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (branchId) {
      where.branchId = branchId;
    }

    const schedules = await prisma.doctorSchedule.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ doctorId: "asc" }, { dayOfWeek: "asc" }],
    });

    return sendSuccess(res, schedules);
  } catch (error) {
    console.error("Get schedules error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Update schedule
 */
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, isAvailable } = req.body;

    const schedule = await prisma.doctorSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return sendError(res, "Schedule not found", 404);
    }

    const updateData = {};
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const updatedSchedule = await prisma.doctorSchedule.update({
      where: { id },
      data: updateData,
      include: {
        doctor: {
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
            code: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      updatedSchedule,
      200,
      "Schedule updated successfully"
    );
  } catch (error) {
    console.error("Update schedule error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Delete schedule
 */
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.doctorSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return sendError(res, "Schedule not found", 404);
    }

    await prisma.doctorSchedule.delete({
      where: { id },
    });

    return sendSuccess(res, null, 200, "Schedule deleted successfully");
  } catch (error) {
    console.error("Delete schedule error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Create availability override
 */
const createAvailability = async (req, res) => {
  try {
    const {
      doctorId,
      date,
      startTime,
      endTime,
      reason,
      isAvailable = false,
    } = req.body;

    // Verify doctor exists
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return sendError(res, "Doctor not found", 404);
    }

    // Set date to start of day
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const availability = await prisma.doctorAvailability.create({
      data: {
        doctorId,
        date: dateObj,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
        isAvailable,
      },
      include: {
        doctor: {
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
      availability,
      201,
      "Availability override created successfully"
    );
  } catch (error) {
    console.error("Create availability error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get availability overrides
 */
const getAvailabilities = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    const where = {};
    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (date) {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = {
        gte: dateObj,
        lt: nextDay,
      };
    }

    const availabilities = await prisma.doctorAvailability.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return sendSuccess(res, availabilities);
  } catch (error) {
    console.error("Get availabilities error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Delete availability override
 */
const deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const availability = await prisma.doctorAvailability.findUnique({
      where: { id },
    });

    if (!availability) {
      return sendError(res, "Availability override not found", 404);
    }

    await prisma.doctorAvailability.delete({
      where: { id },
    });

    return sendSuccess(
      res,
      null,
      200,
      "Availability override deleted successfully"
    );
  } catch (error) {
    console.error("Delete availability error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Check doctor availability for a specific date and time
 */
const checkDoctorAvailability = async (req, res) => {
  try {
    const { doctorId, branchId, date, startTime, endTime } = req.query;

    if (!doctorId || !branchId || !date) {
      return sendError(res, "Doctor ID, branch ID, and date are required", 400);
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get weekly schedule for this day
    const schedule = await prisma.doctorSchedule.findUnique({
      where: {
        doctorId_branchId_dayOfWeek: {
          doctorId,
          branchId,
          dayOfWeek,
        },
      },
    });

    // Get availability override for this specific date
    const dateStart = new Date(appointmentDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const availability = await prisma.doctorAvailability.findFirst({
      where: {
        doctorId,
        date: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
    });

    // Check if doctor has appointments at this time
    const appointmentDateTime = startTime
      ? new Date(`${date}T${startTime}`)
      : new Date(date);
    const appointmentEndTime = endTime
      ? new Date(`${date}T${endTime}`)
      : new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        dentistId: doctorId,
        branchId: branchId,
        date: {
          gte: appointmentDateTime,
          lt: appointmentEndTime,
        },
        status: {
          not: "COMPLETED",
        },
      },
    });

    // Determine availability with detailed reasons
    let isAvailable = true; // Default to available if no restrictions
    let availableStartTime = null;
    let availableEndTime = null;
    let reason = null; // User-friendly reason for unavailability
    let suggestion = null; // Helpful suggestion for user

    // If there's an availability override, use it (this takes priority)
    if (availability) {
      isAvailable = availability.isAvailable;
      availableStartTime =
        availability.startTime || schedule?.startTime || null;
      availableEndTime = availability.endTime || schedule?.endTime || null;
      
      if (!isAvailable) {
        reason = availability.reason || "Doctor has a scheduled unavailability";
        suggestion = "Please select a different date or contact the clinic";
      }
    } else if (schedule) {
      // If schedule exists, use it
      isAvailable = schedule.isAvailable;
      availableStartTime = schedule.startTime;
      availableEndTime = schedule.endTime;

      if (!schedule.isAvailable) {
        reason = "Doctor is not scheduled to work on this day";
        suggestion = "Please select a different day";
      } else if (startTime && schedule.startTime && schedule.endTime) {
        // Check if requested time is within schedule range
        const requestedTime = startTime; // Format: "HH:MM"
        const scheduleStart = schedule.startTime; // Format: "HH:MM"
        const scheduleEnd = schedule.endTime; // Format: "HH:MM"

        // Convert to minutes for comparison
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(":").map(Number);
          return hours * 60 + minutes;
        };

        const requestedMinutes = timeToMinutes(requestedTime);
        const startMinutes = timeToMinutes(scheduleStart);
        const endMinutes = timeToMinutes(scheduleEnd);

        // Check if requested time is within schedule range
        if (requestedMinutes < startMinutes || requestedMinutes >= endMinutes) {
          isAvailable = false;
          reason = `Requested time (${startTime}) is outside doctor's working hours`;
          suggestion = `Doctor is available between ${scheduleStart} and ${scheduleEnd}`;
        }
      }
    } else {
      // No schedule exists - default to available but inform user
      reason = null; // No restrictions
      suggestion = "No schedule configured - appointment can be scheduled";
    }

    // If there are conflicting appointments, doctor is not available
    if (conflictingAppointments.length > 0 && startTime) {
      isAvailable = false;
      reason = `Doctor already has ${conflictingAppointments.length} appointment(s) at this time`;
      suggestion = "Please select a different time slot";
    }

    return sendSuccess(res, {
      isAvailable,
      availableStartTime,
      availableEndTime,
      reason, // User-friendly reason
      suggestion, // Helpful suggestion
      schedule: schedule
        ? { startTime: schedule.startTime, endTime: schedule.endTime }
        : null,
      availabilityOverride: availability
        ? { reason: availability.reason, isAvailable: availability.isAvailable }
        : null,
      conflictingAppointments: conflictingAppointments.length,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  createOrUpdateSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  createAvailability,
  getAvailabilities,
  deleteAvailability,
  checkDoctorAvailability,
};

const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

/**
 * Create a new patient
 */
const createPatient = async (req, res) => {
  try {
    const { name, phone, email, gender, dateOfBirth, address, cardNo, notes } =
      req.body;

    const patient = await prisma.patient.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        cardNo: cardNo || null,
        notes: notes || null,
      },
    });

    return sendSuccess(res, patient, 201, "Patient created successfully");
  } catch (error) {
    console.error("Create patient error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get all patients with optional search/filtering
 */
const getAllPatients = async (req, res) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patient.controller.js:35',message:'getAllPatients entry',data:{hasReqUser:!!req.user,reqUserType:typeof req.user,queryParams:req.query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Log incoming request for debugging
    console.log("=== getAllPatients Request ===");
    console.log("Query params:", JSON.stringify(req.query, null, 2));
    console.log("User role:", req.user?.role);

    const {
      name,
      phone,
      email,
      dateOfBirth_from,
      dateOfBirth_to,
      createdAt_from,
      createdAt_to,
      branchId,
      limit,
      offset,
      xrayOnly, // New parameter: filter to only patients with X-Ray appointments
    } = req.query;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patient.controller.js:55',message:'Before destructuring req.user',data:{reqUserExists:!!req.user,reqUserKeys:req.user?Object.keys(req.user):null,reqUserRole:req.user?.role,reqUserId:req.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const { role, id: userId } = req.user;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patient.controller.js:56',message:'After destructuring req.user',data:{role,userId,branchId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Parse limit and offset with defaults
    // Reduced default limit from 1000 to 100 for better performance
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    // Cap maximum limit to prevent performance issues
    const maxLimit = 500;
    const finalLimit = limitNum > maxLimit ? maxLimit : limitNum;

    const where = {};
    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }
    if (phone) {
      where.phone = {
        contains: phone,
      };
    }
    if (email) {
      where.email = {
        contains: email,
        mode: "insensitive",
      };
    }

    // Date of Birth range filter
    if (dateOfBirth_from || dateOfBirth_to) {
      where.dateOfBirth = {};
      if (dateOfBirth_from) {
        where.dateOfBirth.gte = new Date(dateOfBirth_from);
      }
      if (dateOfBirth_to) {
        const endDate = new Date(dateOfBirth_to);
        endDate.setHours(23, 59, 59, 999);
        where.dateOfBirth.lte = endDate;
      }
    }

    // Created At range filter
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) {
        where.createdAt.gte = new Date(createdAt_from);
      }
      if (createdAt_to) {
        const endDate = new Date(createdAt_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // For XRAY role: filter to only patients with X-Ray appointments/results
    // If xrayOnly is true or user is XRAY role, only show patients with X-Ray related appointments
    if (xrayOnly === "true" || role === "XRAY") {
      // Build conditions for appointments with X-Ray requests or results
      const appointmentConditions = {
        OR: [
          // Appointments assigned to this X-Ray doctor (if XRAY role)
          ...(role === "XRAY"
            ? [
                {
                  xrayId: userId,
                  ...(branchId ? { branchId: branchId } : {}),
                },
              ]
            : [
                {
                  xrayId: { not: null },
                  ...(branchId ? { branchId: branchId } : {}),
                },
              ]),
          // Appointments with X-Ray results
          {
            xrayResult: {
              isNot: null,
            },
            ...(branchId ? { branchId: branchId } : {}),
          },
        ],
      };

      // Filter patients who have appointments matching the conditions
      where.appointments = {
        some: appointmentConditions,
      };
    } else if (branchId) {
      // For non-XRAY roles, filter by branchId if provided
      where.appointments = {
        some: {
          branchId: branchId,
        },
      };
    }

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patient.controller.js:154',message:'Before Prisma query',data:{whereClause:JSON.stringify(where),offsetNum,finalLimit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Optimize query - only select necessary fields for list view
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: offsetNum,
        take: finalLimit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          gender: true,
          dateOfBirth: true,
          address: true,
          cardNo: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patient.controller.js:180',message:'After Prisma query',data:{patientsCount:patients.length,total},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Return patients array directly (client expects response.data?.data || response.data)
    console.log("=== getAllPatients Success ===");
    console.log(`Returning ${patients.length} patients`);
    return sendSuccess(res, patients);
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'patient.controller.js:186',message:'getAllPatients error caught',data:{errorMessage:error.message,errorName:error.name,errorStack:error.stack,hasReqUser:!!req.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    console.error("=== getAllPatients Error ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Helper function to normalize phone number for searching
 * Removes common formatting characters (spaces, dashes, parentheses, plus signs)
 */
const normalizePhoneForSearch = (phone) => {
  if (!phone) return "";
  return phone.replace(/[\s\-\(\)\+\.]/g, "");
};

/**
 * Search patients by name and/or phone number (for autocomplete)
 * Supports searching by name, phone, or both simultaneously
 */
const searchPatients = async (req, res) => {
  try {
    const { name, phone, cardNo, limit = 20, branchId } = req.query;
    const { role, id: userId } = req.user;

    console.log("Patient search request:", {
      name,
      phone,
      cardNo,
      limit,
      branchId,
    });

    // Build OR conditions for name and phone
    const orConditions = [];

    // Search by name - support multi-word search
    if (name && name.trim().length >= 2) {
      const nameQuery = name.trim();
      const nameWords = nameQuery
        .split(/\s+/)
        .filter((word) => word.length > 0);

      // Always add full string search
      orConditions.push({
        name: {
          contains: nameQuery,
          mode: "insensitive",
        },
      });

      // For multi-word queries, also search for names containing all words individually
      // This handles cases like "dagim zenbe" matching "Dagim Zenbe" or variations
      if (nameWords.length > 1) {
        const nameConditions = nameWords.map((word) => ({
          name: {
            contains: word,
            mode: "insensitive",
          },
        }));
        // Add AND condition: name must contain all words
        orConditions.push({
          AND: nameConditions,
        });
      }
    }

    // Search by phone - handle formatting variations
    if (phone && phone.trim().length >= 2) {
      const phoneQuery = phone.trim();
      const normalizedPhone = normalizePhoneForSearch(phoneQuery);

      console.log("Phone search:", { phoneQuery, normalizedPhone });

      // Search phone field - try original query first (handles formatted phones)
      // If normalized is different, also search with normalized version
      const phoneConditions = [];

      // Original query (matches formatted phones like "123-456-7890" or "123 456 7890")
      phoneConditions.push({
        phone: {
          not: null,
          contains: phoneQuery,
        },
      });

      // Normalized query (matches digits only like "1234567890")
      if (normalizedPhone.length >= 2 && normalizedPhone !== phoneQuery) {
        phoneConditions.push({
          phone: {
            not: null,
            contains: normalizedPhone,
          },
        });
      }

      // Add all phone conditions to main OR
      orConditions.push(...phoneConditions);
    }

    // Search by card number
    if (cardNo && cardNo.trim().length >= 2) {
      const cardNoQuery = cardNo.trim();
      orConditions.push({
        cardNo: {
          not: null,
          contains: cardNoQuery,
          mode: "insensitive",
        },
      });
    }

    // If no valid search terms, return empty
    if (orConditions.length === 0) {
      console.log("No valid search conditions");
      return sendSuccess(res, []);
    }

    console.log("Search conditions:", JSON.stringify(orConditions, null, 2));

    // Build where clause with search conditions
    // For patient search, we search ALL patients regardless of branch
    // This allows finding patients even if they don't have appointments yet
    // Branch filtering is handled at the appointment level, not patient level
    const where = {
      OR: orConditions,
    };

    // Note: We don't filter by branchId in patient search because:
    // 1. Patients can exist without appointments (new patients)
    // 2. Patients can have appointments in multiple branches
    // 3. Search should be comprehensive to find any patient
    // Branch scoping is handled when viewing appointments, not when searching patients

    // Search by name OR phone number (or both if both provided)
    const patients = await prisma.patient.findMany({
      where,
      take: parseInt(limit),
      orderBy: { name: "asc" },
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

    console.log(`Found ${patients.length} patients`);
    if (patients.length === 0 && name) {
      // Debug: Check if patient exists with similar name
      const debugPatients = await prisma.patient.findMany({
        take: 5,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      console.log(
        "Sample patient names in DB:",
        debugPatients.map((p) => p.name)
      );
    }
    return sendSuccess(res, patients);
  } catch (error) {
    console.error("Search patients error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get patient by ID
 */
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
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
              },
            },
            treatments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                diagnosis: true,
                status: true,
                createdAt: true,
              },
            },
            xrayResult: {
              select: {
                id: true,
                result: true,
                createdAt: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!patient) {
      return sendError(res, "Patient not found", 404);
    }

    // Transform treatments to treatment for backward compatibility
    const transformedPatient = {
      ...patient,
      appointments: patient.appointments.map((appointment) => {
        const transformed = { ...appointment };
        if (transformed.treatments && Array.isArray(transformed.treatments)) {
          transformed.treatment =
            transformed.treatments.length > 0
              ? transformed.treatments[0]
              : null;
        }
        return transformed;
      }),
    };

    return sendSuccess(res, transformedPatient);
  } catch (error) {
    console.error("Get patient by ID error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Update patient
 */
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, gender, dateOfBirth, address, notes } =
      req.body;

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      return sendError(res, "Patient not found", 404);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (dateOfBirth !== undefined)
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (address !== undefined) updateData.address = address || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(res, patient, 200, "Patient updated successfully");
  } catch (error) {
    console.error("Update patient error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Delete patient (soft delete - check if patient has appointments first)
 */
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!patient) {
      return sendError(res, "Patient not found", 404);
    }

    // Prevent deletion if patient has appointments
    if (patient._count.appointments > 0) {
      return sendError(
        res,
        "Cannot delete patient with existing appointments. Please archive or update appointments first.",
        400
      );
    }

    await prisma.patient.delete({
      where: { id },
    });

    return sendSuccess(res, null, 200, "Patient deleted successfully");
  } catch (error) {
    console.error("Delete patient error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  searchPatients,
  getPatientById,
  updatePatient,
  deletePatient,
};

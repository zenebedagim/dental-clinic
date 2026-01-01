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
    } = req.query;
    const { role } = req.user;

    // Parse limit and offset with defaults
    const limitNum = limit ? parseInt(limit, 10) : 1000;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

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

    // Filter by branchId if provided (for dentists/reception to see patients from their branch)
    // If branchId is provided, only return patients who have appointments in that branch
    if (branchId) {
      where.appointments = {
        some: {
          branchId: branchId,
        },
      };
    }

    // Optimize query - only select necessary fields for list view
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: offsetNum,
        take: limitNum,
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

    // Return patients array directly (client expects response.data?.data || response.data)
    console.log("=== getAllPatients Success ===");
    console.log(`Returning ${patients.length} patients`);
    return sendSuccess(res, patients);
  } catch (error) {
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
    const { name, phone, limit = 20 } = req.query;

    console.log("Patient search request:", { name, phone, limit });

    // Build OR conditions for name and phone
    const orConditions = [];

    // Search by name
    if (name && name.trim().length >= 2) {
      orConditions.push({
        name: {
          contains: name.trim(),
          mode: "insensitive",
        },
      });
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

    // If no valid search terms, return empty
    if (orConditions.length === 0) {
      console.log("No valid search conditions");
      return sendSuccess(res, []);
    }

    console.log("Search conditions:", JSON.stringify(orConditions, null, 2));

    // Search by name OR phone number (or both if both provided)
    const patients = await prisma.patient.findMany({
      where: {
        OR: orConditions,
      },
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
            treatment: {
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

    return sendSuccess(res, patient);
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

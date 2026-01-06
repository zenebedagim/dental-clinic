const prisma = require("../config/db");
const cloudinary = require("../config/cloudinary");
const { sendSuccess, sendError } = require("../utils/response.util");

const uploadXrayResult = async (req, res) => {
  try {
    // Parse JSON fields from FormData (they come as strings)
    let {
      appointmentId,
      result,
      xrayType,
      teeth,
      findings,
      technique,
      urgency,
    } = req.body;
    const { id: xrayId } = req.user;

    // Parse JSON fields if they are strings (from FormData)
    if (typeof teeth === "string") {
      try {
        teeth = JSON.parse(teeth);
      } catch (e) {
        teeth = [];
      }
    }
    if (typeof findings === "string") {
      try {
        findings = JSON.parse(findings);
      } catch (e) {
        findings = null;
      }
    }

    // Verify the appointment is assigned to this X-Ray doctor (if appointmentId provided)
    let appointment = null;
    if (appointmentId) {
      appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        return sendError(res, "Appointment not found", 404);
      }

      if (appointment.xrayId !== xrayId) {
        return sendError(
          res,
          "You can only upload results for your assigned appointments",
          403
        );
      }
    }

    // Upload multiple images to Cloudinary if provided
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      // Parse imageType if provided as array (one per image)
      let imageTypes = [];
      if (req.body.imageTypes) {
        try {
          imageTypes =
            typeof req.body.imageTypes === "string"
              ? JSON.parse(req.body.imageTypes)
              : req.body.imageTypes;
        } catch (e) {
          imageTypes = [];
        }
      }

      // Upload each image
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "dental-clinic/xray",
                resource_type: "image",
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });

          uploadedImages.push({
            imageUrl: uploadResult.secure_url,
            imageType: imageTypes[i] || xrayType || null,
            description: null, // Can be set later via update
          });
        } catch (uploadError) {
          console.error(`Error uploading image ${i + 1}:`, uploadError);
          // Continue with other images even if one fails
        }
      }
    }

    // Prepare X-Ray data
    const xrayData = {
      result: result || null,
      xrayType: xrayType || null,
      teeth: Array.isArray(teeth) ? teeth : [],
      findings: findings ? JSON.parse(JSON.stringify(findings)) : null,
      technique: technique || null,
      urgency: urgency || null,
      sentToDentist: false,
      // Keep imageUrl for backward compatibility (use first image if exists)
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0].imageUrl : null,
    };

    // Create or update X-Ray record
    // If appointmentId is provided, use upsert. Otherwise, create a new record.
    let xrayResult;
    if (appointmentId) {
      xrayResult = await prisma.xRay.upsert({
        where: { appointmentId },
        update: xrayData,
        create: {
          appointmentId,
          ...xrayData,
        },
        include: {
          appointment: {
            include: {
              branch: true,
              dentist: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          images: {
            orderBy: { uploadedAt: "asc" },
          },
        },
      });
    } else {
      // Create X-Ray without appointment (standalone X-Ray record)
      xrayResult = await prisma.xRay.create({
        data: xrayData,
        include: {
          appointment: {
            include: {
              branch: true,
              dentist: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          images: {
            orderBy: { uploadedAt: "asc" },
          },
        },
      });
    }

    // Create XRayImage records for uploaded images
    if (uploadedImages.length > 0) {
      await Promise.all(
        uploadedImages.map((img) =>
          prisma.xRayImage.create({
            data: {
              xrayId: xrayResult.id,
              imageUrl: img.imageUrl,
              imageType: img.imageType,
              description: img.description,
            },
          })
        )
      );

      // Fetch updated result with images
      const updatedResult = await prisma.xRay.findUnique({
        where: { id: xrayResult.id },
        include: {
          appointment: {
            include: {
              branch: true,
              dentist: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          images: {
            orderBy: { uploadedAt: "asc" },
          },
        },
      });

      // Automatically send to the appointment's dentist if appointment exists
      if (xrayResult.appointment && xrayResult.appointment.dentistId) {
        // Update sentToDentist flag automatically
        await prisma.xRay.update({
          where: { id: xrayResult.id },
          data: {
            sentToDentist: true,
          },
        });

        // Refresh updatedResult to include sentToDentist change
        const refreshedResult = await prisma.xRay.findUnique({
          where: { id: xrayResult.id },
          include: {
            appointment: {
              include: {
                branch: true,
                dentist: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            images: {
              orderBy: { uploadedAt: "asc" },
            },
          },
        });


        return sendSuccess(
          res,
          refreshedResult,
          201,
          `${uploadedImages.length} X-Ray image(s) uploaded successfully`
        );
      }

      // Return the result (if no appointment, sentToDentist stays false which is correct)
      return sendSuccess(
        res,
        updatedResult,
        201,
        `${uploadedImages.length} X-Ray image(s) uploaded successfully`
      );
    }

    // Automatically send to the appointment's dentist if appointment exists and results were updated
    if (xrayResult.appointment && xrayResult.appointment.dentistId) {
      // Update sentToDentist flag when results are updated
      await prisma.xRay.update({
        where: { id: xrayResult.id },
        data: {
          sentToDentist: true,
        },
      });

      // Fetch updated result AFTER setting sentToDentist to ensure it's included in response
      const updatedXray = await prisma.xRay.findUnique({
        where: { id: xrayResult.id },
        include: {
          appointment: {
            include: {
              branch: true,
              dentist: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          images: {
            orderBy: { uploadedAt: "asc" },
          },
        },
      });


      return sendSuccess(
        res,
        updatedXray,
        200,
        "X-Ray result updated and sent to dentist successfully"
      );
    }

    return sendSuccess(
      res,
      xrayResult,
      200,
      "X-Ray result updated successfully"
    );
  } catch (error) {
    console.error("Upload X-Ray result error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getXrayRequests = async (req, res) => {
  try {
    const { id: xrayId, role } = req.user;
    const { branchId: selectedBranchId, filter } = req.query;

    const where = {};
    
    // For ADMIN: show all X-Ray requests (no xrayId filter)
    // For XRAY: show only their own requests
    if (role !== "ADMIN") {
      where.xrayId = xrayId;
    }

    if (selectedBranchId) {
      where.branchId = selectedBranchId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        branch: true,
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
        dentist: {
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

    // Transform for backward compatibility
    const transformedAppointments = appointments.map((appointment) => {
      if (appointment.treatments && Array.isArray(appointment.treatments)) {
        appointment.treatment = appointment.treatments.length > 0 ? appointment.treatments[0] : null;
      }
      return appointment;
    });

    // Apply optional server-side filtering
    let filteredAppointments = transformedAppointments;
    if (filter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      switch (filter) {
        case "pending":
          filteredAppointments = appointments.filter(
            (apt) => !apt.xrayResult || !apt.xrayResult.id
          );
          break;
        case "completed":
          filteredAppointments = appointments.filter((apt) => {
            if (!apt.xrayResult || !apt.xrayResult.id) return false;
            const resultDate = new Date(
              apt.xrayResult.updatedAt || apt.xrayResult.createdAt
            );
            return resultDate >= today && resultDate < tomorrow;
          });
          break;
        case "all":
        default:
          // No filtering needed
          break;
      }
    }

    return sendSuccess(res, filteredAppointments);
  } catch (error) {
    console.error("Get X-Ray requests error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get X-Ray images for a specific X-Ray
 */
const getXrayImages = async (req, res) => {
  try {
    const { xrayId } = req.params;
    const { id: userId, role } = req.user;

    // Debug logging
    console.log("getXrayImages - Request:", {
      xrayId,
      userId,
      role,
      user: req.user,
    });

    // Verify X-Ray exists
    const xray = await prisma.xRay.findUnique({
      where: { id: xrayId },
      include: {
        appointment: {
          include: {
            dentist: {
              select: {
                id: true,
              },
            },
            xray: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!xray) {
      return sendError(res, "X-Ray record not found", 404);
    }

    // Authorization checks based on user role
    let hasPermission = false;

    if (role === "ADMIN") {
      // ADMIN can access all X-Ray images
      hasPermission = true;
      console.log("getXrayImages - ADMIN access granted");
    } else if (role === "XRAY") {
      // X-Ray doctors can access if they're assigned to the appointment
      if (xray.appointment && xray.appointment.xrayId === userId) {
        hasPermission = true;
        console.log("getXrayImages - XRAY access granted");
      }
    } else if (role === "DENTIST") {
      // Dentists can access if:
      // 1. The X-ray was sent to them (sentToDentist is true), OR
      // 2. They are the dentist assigned to the appointment
      if (xray.sentToDentist) {
        hasPermission = true;
        console.log("getXrayImages - DENTIST access granted (sentToDentist)");
      } else if (xray.appointment && xray.appointment.dentistId === userId) {
        hasPermission = true;
        console.log("getXrayImages - DENTIST access granted (appointment)");
      }
    }

    if (!hasPermission) {
      console.log("getXrayImages - Access denied:", { role, userId, xrayId });
      return sendError(res, "Unauthorized access to X-Ray images", 403);
    }

    const images = await prisma.xRayImage.findMany({
      where: { xrayId },
      orderBy: { uploadedAt: "asc" },
    });

    return sendSuccess(res, images);
  } catch (error) {
    console.error("Get X-Ray images error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Delete X-Ray image
 */
const deleteXrayImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { id: userId } = req.user;

    // Find image and verify ownership
    const image = await prisma.xRayImage.findUnique({
      where: { id: imageId },
      include: {
        xray: {
          include: {
            appointment: true,
          },
        },
      },
    });

    if (!image) {
      return sendError(res, "X-Ray image not found", 404);
    }

    // Check if user has permission
    // If appointment exists, verify assignment. Otherwise, allow X-Ray doctor access.
    if (image.xray.appointment && image.xray.appointment.xrayId !== userId) {
      return sendError(res, "Unauthorized to delete this image", 403);
    }

    await prisma.xRayImage.delete({
      where: { id: imageId },
    });

    return sendSuccess(res, null, 200, "X-Ray image deleted successfully");
  } catch (error) {
    console.error("Delete X-Ray image error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const sendToDentist = async (req, res) => {
  try {
    const { id } = req.params;
    const { dentistId } = req.body || {}; // Optional: allow selecting a different dentist
    const { id: xrayId } = req.user;

    // Log for debugging
    console.log("Send X-Ray to dentist request:", {
      xrayId,
      dentistId,
      xrayId: id,
      body: req.body,
      bodyType: typeof req.body,
      dentistIdType: typeof dentistId,
      dentistIdValue: dentistId,
    });

    const xrayResult = await prisma.xRay.findUnique({
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
                gender: true,
                dateOfBirth: true,
                cardNo: true,
                address: true,
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

    if (!xrayResult) {
      return sendError(res, "X-Ray result not found", 404);
    }

    // Check authorization - X-Ray doctor can only send their own results
    // For appointments: verify the X-Ray doctor is assigned
    // For standalone X-Rays: allow any X-Ray doctor to send (no ownership tracking)
    if (xrayResult.appointment) {
      if (xrayResult.appointment.xrayId !== xrayId) {
        return sendError(res, "You can only send your own X-Ray results", 403);
      }
    }
    // If no appointment (standalone X-Ray), allow any X-Ray doctor to send

    // Determine which dentist to send to
    let targetDentistId = dentistId;

    // If dentistId is provided, verify the dentist exists
    if (targetDentistId) {
      const dentist = await prisma.user.findUnique({
        where: { id: targetDentistId },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!dentist) {
        return sendError(res, "Dentist not found", 404);
      }

      if (dentist.role !== "DENTIST") {
        return sendError(res, "Selected user is not a dentist", 400);
      }
    } else if (xrayResult.appointment && xrayResult.appointment.dentistId) {
      // Use appointment's dentist if no dentistId provided (backward compatibility)
      targetDentistId = xrayResult.appointment.dentistId;
    } else {
      // Require dentistId for standalone X-Rays (no appointment)
      return sendError(
        res,
        "No dentist specified. Please select a dentist.",
        400
      );
    }

    // Store which dentist this was sent to (for tracking and display)
    const updatedXray = await prisma.xRay.update({
      where: { id },
      data: {
        sentToDentist: true,
        // Note: We'll add sentToDentistId field in schema if needed, for now we track via notification
      },
      include: {
        appointment: {
          include: {
            branch: true,
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
    });

    return sendSuccess(
      res,
      updatedXray,
      200,
      "X-Ray result sent to dentist successfully"
    );
  } catch (error) {
    console.error("Send to dentist error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  uploadXrayResult,
  getXrayRequests,
  sendToDentist,
  getXrayImages,
  deleteXrayImage,
};

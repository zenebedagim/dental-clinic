const prisma = require("../config/db");
const cloudinary = require("../config/cloudinary");
const { sendSuccess, sendError } = require("../utils/response.util");
const {
  generateSecureToken,
  hashPassword,
  comparePassword,
} = require("../utils/crypto.util");

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

    // Notify dentist if appointment exists
    if (xrayResult.appointment && xrayResult.appointment.dentistId) {
      try {
        const notificationService = require('../services/notification.service');
        const { NotificationType } = require('../utils/notificationTypes');
        
        await notificationService.notifyUser(xrayResult.appointment.dentistId, {
          type: NotificationType.XRAY_READY,
          title: 'X-Ray Result Ready',
          message: `X-Ray result for ${xrayResult.appointment.patientName || 'patient'} is ready`,
          data: {
            xrayId: xrayResult.id,
            appointmentId: xrayResult.appointmentId,
            xrayType: xrayResult.xrayType,
          },
        });
      } catch (notifError) {
        console.error('Error sending X-Ray upload notification:', notifError);
      }
    }

    return sendSuccess(
      res,
      updatedResult,
      201,
      `${uploadedImages.length} X-Ray image(s) uploaded successfully`
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
    const { id: xrayId } = req.user;
    const { branchId: selectedBranchId } = req.query;

    const where = {
      xrayId,
    };

    if (selectedBranchId) {
      where.branchId = selectedBranchId;
    }

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
        xrayResult: true,
      },
      orderBy: { date: "desc" },
    });

    return sendSuccess(res, appointments);
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
    const { id: userId } = req.user;

    // Verify X-Ray exists and belongs to this X-Ray doctor
    const xray = await prisma.xRay.findUnique({
      where: { id: xrayId },
      include: {
        appointment: true,
      },
    });

    if (!xray) {
      return sendError(res, "X-Ray record not found", 404);
    }

    // Check if user has permission (either X-Ray doctor assigned or admin role)
    // If appointment exists, verify assignment. Otherwise, allow access to X-Ray doctor who created it.
    if (xray.appointment && xray.appointment.xrayId !== userId) {
      return sendError(res, "Unauthorized access to X-Ray images", 403);
    }
    // If no appointment, we could add additional permission checks here if needed

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
    const { id: xrayId } = req.user;

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

    // Can only send to dentist if there's an appointment
    if (!xrayResult.appointment) {
      return sendError(res, "Cannot send X-Ray result: No associated appointment", 400);
    }
    
    if (xrayResult.appointment.xrayId !== xrayId) {
      return sendError(res, "You can only send your own X-Ray results", 403);
    }

    const updatedXray = await prisma.xRay.update({
      where: { id },
      data: { sentToDentist: true },
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

    // Notify dentist that X-Ray was sent with patient information
    if (updatedXray.appointment && updatedXray.appointment.dentistId) {
      try {
        const notificationService = require('../services/notification.service');
        const { NotificationType } = require('../utils/notificationTypes');
        
        const patientName = updatedXray.appointment.patientName || updatedXray.appointment.patient?.name || 'patient';
        const patientPhone = updatedXray.appointment.patient?.phone || 'N/A';
        const patientCardNo = updatedXray.appointment.patient?.cardNo || 'N/A';
        
        await notificationService.notifyUser(updatedXray.appointment.dentistId, {
          type: NotificationType.XRAY_SENT,
          title: 'X-Ray Sent',
          message: `X-Ray result for ${patientName} (${patientPhone}) has been sent`,
          data: {
            xrayId: updatedXray.id,
            appointmentId: updatedXray.appointmentId,
            xrayType: updatedXray.xrayType,
            // Include patient information
            patient: {
              id: updatedXray.appointment.patient?.id,
              name: patientName,
              phone: patientPhone,
              cardNo: patientCardNo,
              gender: updatedXray.appointment.patient?.gender,
              dateOfBirth: updatedXray.appointment.patient?.dateOfBirth,
              address: updatedXray.appointment.patient?.address,
            },
            appointment: {
              id: updatedXray.appointment.id,
              date: updatedXray.appointment.date,
              patientName: patientName,
            },
            branch: {
              id: updatedXray.appointment.branch?.id,
              name: updatedXray.appointment.branch?.name,
            },
          },
        });
      } catch (notifError) {
        console.error('Error sending X-Ray sent notification:', notifError);
      }
    }

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

/**
 * Create a shareable link for X-Ray
 */
const createXrayShare = async (req, res) => {
  try {
    const { xrayId } = req.params;
    const { password, expiresAt, maxViews } = req.body;
    const { id: userId } = req.user;

    // Verify X-Ray exists and user has permission
    const xray = await prisma.xRay.findUnique({
      where: { id: xrayId },
      include: {
        appointment: true,
      },
    });

    if (!xray) {
      return sendError(res, "X-Ray record not found", 404);
    }

    // Check if user has permission (X-Ray doctor assigned or admin)
    // If appointment exists, verify assignment. Otherwise, allow X-Ray doctor access.
    if (xray.appointment && xray.appointment.xrayId !== userId) {
      return sendError(res, "Unauthorized to share this X-Ray", 403);
    }

    // Generate secure token
    const shareToken = generateSecureToken(32);

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    // Parse expiration date
    let expiresAtDate = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return sendError(res, "Invalid expiration date format", 400);
      }
    }

    // Create share link
    const share = await prisma.xrayShare.create({
      data: {
        xrayId,
        shareToken,
        password: hashedPassword,
        expiresAt: expiresAtDate,
        maxViews: maxViews ? parseInt(maxViews) : null,
        createdBy: userId,
      },
      include: {
        xray: {
          include: {
            appointment: {
              select: {
                patientName: true,
              },
            },
          },
        },
      },
    });

    // Generate share URL (frontend URL + share token)
    const shareUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5174"
    }/xray-share/${shareToken}`;

    return sendSuccess(
      res,
      {
        ...share,
        shareUrl,
        password: undefined, // Don't send password hash to client
      },
      201,
      "Share link created successfully"
    );
  } catch (error) {
    console.error("Create X-Ray share error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get shareable links for an X-Ray
 */
const getXrayShares = async (req, res) => {
  try {
    const { xrayId } = req.params;
    const { id: userId } = req.user;

    // Verify X-Ray exists and user has permission
    const xray = await prisma.xRay.findUnique({
      where: { id: xrayId },
      include: {
        appointment: true,
      },
    });

    if (!xray) {
      return sendError(res, "X-Ray record not found", 404);
    }

    // Check if user has permission
    if (xray.appointment.xrayId !== userId) {
      return sendError(res, "Unauthorized to view shares for this X-Ray", 403);
    }

    const shares = await prisma.xrayShare.findMany({
      where: { xrayId },
      orderBy: { createdAt: "desc" },
    });

    // Generate share URLs
    const sharesWithUrls = shares.map((share) => ({
      ...share,
      shareUrl: `${
        process.env.FRONTEND_URL || "http://localhost:5174"
      }/xray-share/${share.shareToken}`,
      password: undefined, // Don't send password hash
    }));

    return sendSuccess(res, sharesWithUrls);
  } catch (error) {
    console.error("Get X-Ray shares error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Revoke/deactivate a share link
 */
const revokeXrayShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { id: userId } = req.user;

    // Find share and verify ownership
    const share = await prisma.xrayShare.findUnique({
      where: { id: shareId },
      include: {
        xray: {
          include: {
            appointment: true,
          },
        },
      },
    });

    if (!share) {
      return sendError(res, "Share link not found", 404);
    }

    // Check if user has permission
    // If appointment exists, verify assignment. Otherwise, allow X-Ray doctor access.
    if (share.xray.appointment && share.xray.appointment.xrayId !== userId) {
      return sendError(res, "Unauthorized to revoke this share link", 403);
    }

    // Deactivate share
    const updatedShare = await prisma.xrayShare.update({
      where: { id: shareId },
      data: { isActive: false },
    });

    return sendSuccess(
      res,
      updatedShare,
      200,
      "Share link revoked successfully"
    );
  } catch (error) {
    console.error("Revoke X-Ray share error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * View shared X-Ray (public endpoint, no auth required)
 */
const viewSharedXray = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find share by token
    const share = await prisma.xrayShare.findUnique({
      where: { shareToken: token },
      include: {
        xray: {
          include: {
            appointment: {
              select: {
                patientName: true,
                date: true,
              },
            },
            images: {
              orderBy: { uploadedAt: "asc" },
            },
          },
        },
      },
    });

    if (!share) {
      return sendError(res, "Share link not found", 404);
    }

    // Check if share is active
    if (!share.isActive) {
      return sendError(res, "This share link has been deactivated", 403);
    }

    // Check expiration
    if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
      return sendError(res, "This share link has expired", 403);
    }

    // Check max views
    if (share.maxViews && share.viewCount >= share.maxViews) {
      return sendError(
        res,
        "Maximum view limit reached for this share link",
        403
      );
    }

    // Check password if set
    if (share.password) {
      if (!password) {
        return sendError(res, "Password required", 401, {
          requiresPassword: true,
        });
      }

      const passwordMatch = await comparePassword(password, share.password);
      if (!passwordMatch) {
        return sendError(res, "Incorrect password", 401);
      }
    }

    // Increment view count
    await prisma.xrayShare.update({
      where: { id: share.id },
      data: { viewCount: share.viewCount + 1 },
    });

    // Return X-Ray data (excluding sensitive information)
    return sendSuccess(res, {
      xray: share.xray,
      shareInfo: {
        viewCount: share.viewCount + 1,
        maxViews: share.maxViews,
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    console.error("View shared X-Ray error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  uploadXrayResult,
  getXrayRequests,
  sendToDentist,
  getXrayImages,
  deleteXrayImage,
  createXrayShare,
  getXrayShares,
  revokeXrayShare,
  viewSharedXray,
};

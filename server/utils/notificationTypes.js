/**
 * Notification Types and Constants
 * Defines all notification types, priorities, and routing information
 */

const NotificationType = {
  APPOINTMENT_CREATED: "APPOINTMENT_CREATED",
  APPOINTMENT_UPDATED: "APPOINTMENT_UPDATED",
  APPOINTMENT_CANCELLED: "APPOINTMENT_CANCELLED",
  XRAY_READY: "XRAY_READY",
  XRAY_SENT: "XRAY_SENT",
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_UPDATED: "PAYMENT_UPDATED",
  TREATMENT_COMPLETED: "TREATMENT_COMPLETED",
  TREATMENT_COST_UPDATED: "TREATMENT_COST_UPDATED",
  DETAILED_BILLING_ENABLED: "DETAILED_BILLING_ENABLED",
};

const NotificationPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

/**
 * Priority mapping for notification types
 */
const NOTIFICATION_PRIORITIES = {
  [NotificationType.APPOINTMENT_CREATED]: NotificationPriority.NORMAL,
  [NotificationType.APPOINTMENT_UPDATED]: NotificationPriority.NORMAL,
  [NotificationType.APPOINTMENT_CANCELLED]: NotificationPriority.CRITICAL,
  [NotificationType.XRAY_READY]: NotificationPriority.HIGH,
  [NotificationType.XRAY_SENT]: NotificationPriority.HIGH,
  [NotificationType.PAYMENT_CREATED]: NotificationPriority.LOW,
  [NotificationType.PAYMENT_UPDATED]: NotificationPriority.NORMAL,
  [NotificationType.TREATMENT_COMPLETED]: NotificationPriority.HIGH,
  [NotificationType.TREATMENT_COST_UPDATED]: NotificationPriority.NORMAL,
  [NotificationType.DETAILED_BILLING_ENABLED]: NotificationPriority.LOW,
};

/**
 * Action URLs for navigation
 */
const NOTIFICATION_ACTION_URLS = {
  [NotificationType.APPOINTMENT_CREATED]: (data) => `/dentist/appointments`,
  [NotificationType.APPOINTMENT_UPDATED]: (data) => `/dentist/appointments`,
  [NotificationType.APPOINTMENT_CANCELLED]: (data) => `/reception/appointments`,
  [NotificationType.XRAY_READY]: (data) => `/dentist/xray`,
  [NotificationType.XRAY_SENT]: (data) => {
    // Navigate to appointment if available, otherwise to xray list
    if (data?.appointmentId) {
      return `/dentist/appointments/${data.appointmentId}`;
    }
    if (data?.xrayId) {
      return `/dentist/xray/${data.xrayId}`;
    }
    return `/dentist/xray`;
  },
  [NotificationType.PAYMENT_CREATED]: (data) => `/reception/payments`,
  [NotificationType.PAYMENT_UPDATED]: (data) => `/reception/payments`,
  [NotificationType.TREATMENT_COMPLETED]: (data) => `/reception/appointments`,
  [NotificationType.TREATMENT_COST_UPDATED]: (data) => `/reception/payments`,
  [NotificationType.DETAILED_BILLING_ENABLED]: (data) => `/reception/payments`,
};

/**
 * Default titles for notification types
 */
const NOTIFICATION_TITLES = {
  [NotificationType.APPOINTMENT_CREATED]: "New Appointment",
  [NotificationType.APPOINTMENT_UPDATED]: "Appointment Updated",
  [NotificationType.APPOINTMENT_CANCELLED]: "Appointment Cancelled",
  [NotificationType.XRAY_READY]: "X-Ray Result Ready",
  [NotificationType.XRAY_SENT]: "X-Ray Sent to Dentist",
  [NotificationType.PAYMENT_CREATED]: "Payment Created",
  [NotificationType.PAYMENT_UPDATED]: "Payment Updated",
  [NotificationType.TREATMENT_COMPLETED]: "Treatment Completed",
  [NotificationType.TREATMENT_COST_UPDATED]: "Treatment Cost Updated",
  [NotificationType.DETAILED_BILLING_ENABLED]: "Detailed Billing Enabled",
};

/**
 * Get priority for notification type
 */
const getPriority = (type) => {
  return NOTIFICATION_PRIORITIES[type] || NotificationPriority.NORMAL;
};

/**
 * Get action URL for notification type
 */
const getActionUrl = (type, data = {}) => {
  const urlGenerator = NOTIFICATION_ACTION_URLS[type];
  if (urlGenerator && typeof urlGenerator === "function") {
    return urlGenerator(data);
  }
  return "/";
};

/**
 * Get default title for notification type
 */
const getDefaultTitle = (type) => {
  return NOTIFICATION_TITLES[type] || "Notification";
};

/**
 * Check if notification requires ACK based on priority
 */
const requiresAck = (priority) => {
  return (
    priority === NotificationPriority.CRITICAL ||
    priority === NotificationPriority.HIGH
  );
};

/**
 * Get ACK timeout based on priority (in milliseconds)
 */
const getAckTimeout = (priority) => {
  const timeouts = {
    [NotificationPriority.CRITICAL]: parseInt(
      process.env.NOTIFICATION_ACK_TIMEOUT_CRITICAL || "30000"
    ),
    [NotificationPriority.HIGH]: parseInt(
      process.env.NOTIFICATION_ACK_TIMEOUT_HIGH || "60000"
    ),
    [NotificationPriority.NORMAL]: null,
    [NotificationPriority.LOW]: null,
  };
  return timeouts[priority] || null;
};

/**
 * Get max retries based on priority
 */
const getMaxRetries = (priority) => {
  const retries = {
    [NotificationPriority.CRITICAL]: parseInt(
      process.env.NOTIFICATION_MAX_RETRIES || "3"
    ),
    [NotificationPriority.HIGH]: parseInt(
      process.env.NOTIFICATION_MAX_RETRIES || "3"
    ),
    [NotificationPriority.NORMAL]: 2,
    [NotificationPriority.LOW]: 1,
  };
  return retries[priority] || 1;
};

module.exports = {
  NotificationType,
  NotificationPriority,
  getPriority,
  getActionUrl,
  getDefaultTitle,
  requiresAck,
  getAckTimeout,
  getMaxRetries,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_ACTION_URLS,
  NOTIFICATION_TITLES,
};

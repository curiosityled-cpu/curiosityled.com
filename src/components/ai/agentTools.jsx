/**
 * Agent Tools Registry
 * Defines all available actions Atreus can execute
 */

// Confirmation levels framework
export const CONFIRMATION_LEVELS = {
  LOW: {
    display: 'toast_only',
    requireConfirm: false,
    showImpact: false,
    level: 'LOW'
  },
  MEDIUM: {
    display: 'simple_modal',
    requireConfirm: true,
    showImpact: true,
    showAffectedUsers: true,
    level: 'MEDIUM'
  },
  HIGH: {
    display: 'detailed_modal',
    requireConfirm: true,
    showImpact: true,
    showAffectedUsers: true,
    showReversibility: true,
    showPreview: true,
    level: 'HIGH'
  },
  CRITICAL: {
    display: 'full_impact_modal',
    requireConfirm: true,
    requireTypedConfirmation: true,
    showImpact: true,
    showAffectedUsers: true,
    showReversibility: true,
    showWarnings: true,
    showAuditLog: true,
    level: 'CRITICAL'
  }
};

export const AGENT_TOOLS = {
  // Reports & Analytics
  generateReport: {
    name: "generateReport",
    description: "Creates and exports a performance, learning, or assessment report in PDF or CSV format",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        reportType: { 
          type: "string", 
          enum: ["performance", "learning", "assessment", "journey", "team_performance", "platform_analytics"],
          description: "Type of report to generate"
        },
        format: { 
          type: "string", 
          enum: ["pdf", "csv"],
          description: "Export format"
        },
        dateRange: { 
          type: "string",
          enum: ["7days", "30days", "3months", "6months", "1year", "custom"],
          description: "Time range for the report"
        },
        scope: {
          type: "string",
          enum: ["personal", "team", "org", "platform"],
          description: "Scope of the report"
        }
      },
      required: ["reportType", "format"]
    },
    requiredPermissions: ["reports.create"],
    needsConfirmation: false
  },

  // Notifications & Reminders
  createReminder: {
    name: "createReminder",
    description: "Creates a reminder/notification for the user or their team",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Reminder title" },
        message: { type: "string", description: "Reminder message body" },
        scheduledFor: { type: "string", description: "ISO date-time when to send the reminder" },
        recipientEmails: { 
          type: "array", 
          items: { type: "string" },
          description: "Email addresses of recipients (defaults to current user)"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority level"
        },
        relatedEntityType: { type: "string", description: "e.g., Goal, AssignedLearning" },
        relatedEntityId: { type: "string", description: "ID of related entity" }
      },
      required: ["title", "message", "scheduledFor"]
    },
    requiredPermissions: ["notifications.create"],
    needsConfirmation: true
  },

  scheduleNotification: {
    name: "scheduleNotification",
    description: "Schedules a notification for a specific date/time",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        type: { 
          type: "string", 
          enum: ["reminder", "nudge", "milestone", "assessment_due", "learning_assigned", "goal_deadline", "1on1_scheduled"],
          description: "Type of notification"
        },
        title: { type: "string" },
        message: { type: "string" },
        scheduledFor: { type: "string", description: "ISO date-time" },
        userEmail: { type: "string", description: "Recipient email" }
      },
      required: ["type", "title", "message", "scheduledFor", "userEmail"]
    },
    requiredPermissions: ["notifications.create"],
    needsConfirmation: true
  },

  // Learning & Development
  assignLearning: {
    name: "assignLearning",
    description: "Assigns a learning resource to user(s)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        learningResourceId: { type: "string", description: "ID of the learning resource" },
        resourceTitle: { type: "string", description: "Title of the resource for confirmation" },
        userEmails: { 
          type: "array", 
          items: { type: "string" },
          description: "Email addresses of users to assign to"
        },
        dueDate: { type: "string", description: "Optional due date" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        notes: { type: "string", description: "Additional instructions" }
      },
      required: ["learningResourceId", "userEmails"]
    },
    requiredPermissions: ["learning.assign"],
    needsConfirmation: true
  },

  assignJourney: {
    name: "assignJourney",
    description: "Assigns a learning journey to user(s)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        journeyTitle: { type: "string" },
        userEmails: { type: "array", items: { type: "string" } },
        startDate: { type: "string" }
      },
      required: ["journeyId", "userEmails"]
    },
    requiredPermissions: ["journeys.assign"],
    needsConfirmation: true
  },

  // Goals & Performance
  createGoal: {
    name: "createGoal",
    description: "Creates a new goal for the user or assigns to team",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        timeframeEnd: { type: "string", description: "Due date" },
        assignedToEmails: { 
          type: "array", 
          items: { type: "string" },
          description: "Emails to assign goal to (optional)"
        },
        linkedCompetencyIds: { type: "array", items: { type: "string" } }
      },
      required: ["title"]
    },
    requiredPermissions: ["goals.create"],
    needsConfirmation: true
  },

  cascadeGoal: {
    name: "cascadeGoal",
    description: "Cascades an existing goal to team members",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string" },
        userEmails: { type: "array", items: { type: "string" } },
        customizePerUser: { type: "boolean", description: "Allow customization per recipient" }
      },
      required: ["goalId", "userEmails"]
    },
    requiredPermissions: ["goals.cascade"],
    needsConfirmation: true
  },

  // Calendar & Events
  scheduleCalendarEvent: {
    name: "scheduleCalendarEvent",
    description: "Schedules a calendar event (meeting, coaching session, review)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        startTime: { type: "string", description: "ISO date-time" },
        durationMinutes: { type: "number", description: "Duration in minutes" },
        attendeeEmails: { type: "array", items: { type: "string" } },
        eventType: { 
          type: "string", 
          enum: ["meeting", "coaching_session", "one_on_one", "review", "team_checkin"],
          description: "Type of event"
        }
      },
      required: ["title", "startTime", "durationMinutes"]
    },
    requiredPermissions: ["calendar.create"],
    needsConfirmation: true
  },

  // ==================== USER MANAGEMENT & SECURITY TOOLS (12) ====================
  inviteUser: {
    name: "inviteUser",
    description: "Invites a new user to the platform",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
        role: { 
          type: "string",
          enum: ["User Level 1", "User Level 2", "Analyst", "Admin Level 1", "Admin Level 2"]
        },
        fullName: { type: "string" }
      },
      required: ["email", "role"]
    },
    requiredPermissions: ["users.invite"],
    needsConfirmation: true
  },

  setAccountExpiration: {
    name: "setAccountExpiration",
    description: "Sets expiration date for a user account (auto-suspend on date)",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        expirationDate: { type: "string", description: "ISO date when account expires" },
        notifyUser: { type: "boolean", description: "Send notification to user", default: true },
        notifyDaysBefore: { type: "number", description: "Notify X days before expiration", default: 7 }
      },
      required: ["userEmail", "expirationDate"]
    },
    requiredPermissions: ["users.manage_expiration"],
    needsConfirmation: true
  },

  bulkSetAccountExpiration: {
    name: "bulkSetAccountExpiration",
    description: "Sets expiration for multiple users (e.g., all contractors)",
    confirmationLevel: CONFIRMATION_LEVELS.CRITICAL,
    parameters: {
      type: "object",
      properties: {
        userEmails: { type: "array", items: { type: "string" }, description: "User emails" },
        fileUrl: { type: "string", description: "CSV file with emails and expiration dates" },
        expirationDate: { type: "string", description: "Default expiration date (if not in CSV)" },
        notifyUsers: { type: "boolean", default: true }
      },
      required: []
    },
    requiredPermissions: ["users.bulk_manage"],
    needsConfirmation: true,
    requiresFileUpload: true
  },

  resendUserInvitation: {
    name: "resendUserInvitation",
    description: "Resends invitation email to pending users",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmails: { type: "array", items: { type: "string" } },
        customMessage: { type: "string", description: "Optional personal note" }
      },
      required: ["userEmails"]
    },
    requiredPermissions: ["users.invite"],
    needsConfirmation: true
  },

  unlockUserAccount: {
    name: "unlockUserAccount",
    description: "Unlocks account locked due to failed login attempts",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        resetFailedAttempts: { type: "boolean", description: "Reset failed login counter", default: true }
      },
      required: ["userEmail"]
    },
    requiredPermissions: ["security.manage_accounts"],
    needsConfirmation: true
  },

  viewUserEngagementMetrics: {
    name: "viewUserEngagementMetrics",
    description: "Shows detailed engagement statistics for a user",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        dateRange: { 
          type: "string", 
          enum: ["30days", "90days", "6months"],
          default: "30days"
        }
      },
      required: ["userEmail"]
    },
    requiredPermissions: ["analytics.view_user_activity"],
    needsConfirmation: false
  },

  // Email
  sendEmail: {
    name: "sendEmail",
    description: "Sends an email to specified recipients",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        to: { type: "array", items: { type: "string" }, description: "Recipient emails" },
        subject: { type: "string" },
        body: { type: "string", description: "Email body content" },
        fromName: { type: "string", description: "Sender name (optional)" }
      },
      required: ["to", "subject", "body"]
    },
    requiredPermissions: ["email.send"],
    needsConfirmation: true
  },

  // Bulk Operations
  bulkAssignLearning: {
    name: "bulkAssignLearning",
    description: "Assigns learning to multiple users at once (team, division, or all users)",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        learningResourceId: { type: "string" },
        resourceTitle: { type: "string" },
        targetType: { 
          type: "string", 
          enum: ["team", "division", "specific_users", "all_users"],
          description: "Who to assign to"
        },
        userEmails: { type: "array", items: { type: "string" }, description: "For specific_users target type" },
        dueDate: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
      },
      required: ["learningResourceId", "targetType"]
    },
    requiredPermissions: ["learning.assign"],
    needsConfirmation: true
  },

  bulkCreateGoals: {
    name: "bulkCreateGoals",
    description: "Creates multiple goals at once from a list or action plan",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        goals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              timeframeEnd: { type: "string" }
            }
          },
          description: "Array of goals to create"
        },
        assignToEmails: { 
          type: "array", 
          items: { type: "string" },
          description: "Optionally assign all goals to these users"
        }
      },
      required: ["goals"]
    },
    requiredPermissions: ["goals.create"],
    needsConfirmation: true
  },

  // Gamification Tools
  getUserAchievements: {
    name: "getUserAchievements",
    description: "Gets current user's gamification achievements, points, level, badges, and leaderboard position",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string", description: "Email of user (defaults to current user)" }
      },
      required: []
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  explainBadgeCriteria: {
    name: "explainBadgeCriteria",
    description: "Explains how to earn a specific badge, including criteria and progress",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        badgeName: { type: "string", description: "Name of the badge to explain" }
      },
      required: ["badgeName"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  suggestPointAwards: {
    name: "suggestPointAwards",
    description: "Suggests appropriate point values for activities, programs, or custom achievements (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        activityType: { 
          type: "string",
          enum: ["learning", "assessment", "goal", "program", "journey", "coaching", "custom"],
          description: "Type of activity"
        },
        difficulty: {
          type: "string",
          enum: ["easy", "medium", "hard", "expert"],
          description: "Difficulty level of the activity"
        },
        duration: { type: "string", description: "Estimated time to complete" },
        description: { type: "string", description: "Details about the activity" }
      },
      required: ["activityType"]
    },
    requiredPermissions: ["gamification.configure"],
    needsConfirmation: false
  },

  designBadgeStructure: {
    name: "designBadgeStructure",
    description: "AI-powered badge structure design for programs, roles, or initiatives (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        targetAudience: { type: "string", description: "Who are the badges for? (e.g., new managers, sales team)" },
        programGoals: { type: "string", description: "What behaviors do you want to encourage?" },
        existingBadges: { type: "array", items: { type: "string" }, description: "Existing badge names to avoid duplicates" }
      },
      required: ["targetAudience", "programGoals"]
    },
    requiredPermissions: ["gamification.configure"],
    needsConfirmation: false
  },

  createCompetition: {
    name: "createCompetition",
    description: "Creates a time-bound competition to drive engagement (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        competitionName: { type: "string" },
        description: { type: "string" },
        competitionType: {
          type: "string",
          enum: ["individual", "team", "cohort"],
          description: "Type of competition"
        },
        startDate: { type: "string", description: "ISO date-time" },
        endDate: { type: "string", description: "ISO date-time" },
        criteriaMetric: { 
          type: "string",
          enum: ["points", "goals_completed", "learning_completed", "assessments_taken"],
          description: "What to compete on"
        },
        participantEmails: { type: "array", items: { type: "string" } },
        rewards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rank: { type: "number" },
              points: { type: "number" },
              badgeId: { type: "string" }
            }
          }
        }
      },
      required: ["competitionName", "competitionType", "startDate", "endDate", "criteriaMetric"]
    },
    requiredPermissions: ["gamification.configure"],
    needsConfirmation: true
  },

  awardPointsToUser: {
    name: "awardPointsToUser",
    description: "Manually awards points to a user for recognition or custom achievement (Manager/Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        pointsAmount: { type: "number" },
        reason: { type: "string", description: "Why are these points being awarded?" }
      },
      required: ["userEmail", "pointsAmount", "reason"]
    },
    requiredPermissions: ["gamification.award_points"],
    needsConfirmation: true
  },

  // ==================== EMAIL TEMPLATE TOOLS (5) ====================
  generateEmailTemplate: {
    name: "generateEmailTemplate",
    description: "Generates an email template using AI based on description and purpose",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        templateName: { type: "string", description: "Name for the template" },
        category: { 
          type: "string", 
          enum: ["account", "notification", "system", "learning", "security"],
          description: "Category of the template"
        },
        purpose: { type: "string", description: "What is this email for?" },
        tone: { 
          type: "string", 
          enum: ["professional", "friendly", "urgent", "celebratory"],
          description: "Desired tone of the email"
        },
        includeVariables: { 
          type: "array", 
          items: { type: "string" },
          description: "Template variables to include (e.g., user_name, platform_name)"
        },
        targetAudience: { type: "string", description: "Target audience (e.g., new managers, all users)" }
      },
      required: ["templateName", "category", "purpose"]
    },
    requiredPermissions: ["email_templates.manage"],
    needsConfirmation: false
  },

  recommendEmailTemplate: {
    name: "recommendEmailTemplate",
    description: "Recommends existing email templates for a specific use case",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        useCase: { type: "string", description: "What do you want to send an email about?" },
        recipientType: { 
          type: "string", 
          enum: ["user", "team", "admin", "external"],
          description: "Who is the recipient?"
        },
        variables: {
          type: "array",
          items: { type: "string" },
          description: "Optional: specific variables needed"
        }
      },
      required: ["useCase"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  suggestSubjectLines: {
    name: "suggestSubjectLines",
    description: "Generates 5 compelling subject line variations for an email",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        emailPurpose: { type: "string", description: "Purpose of the email" },
        tone: { type: "string", enum: ["professional", "friendly", "urgent", "celebratory"] },
        includeEmoji: { type: "boolean", description: "Include emojis in subject lines" }
      },
      required: ["emailPurpose"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  validateTemplateVariables: {
    name: "validateTemplateVariables",
    description: "Checks if an email template has all needed variables for a specific use case",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "ID of the template to validate" },
        intendedUse: { type: "string", description: "How will this template be used?" }
      },
      required: ["templateId", "intendedUse"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  previewEmailWithData: {
    name: "previewEmailWithData",
    description: "Renders an email template with sample data for preview",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "ID of the template" },
        sampleData: { 
          type: "object", 
          description: "Sample data for variables (e.g., {user_name: 'John', platform_name: 'Acme'})"
        }
      },
      required: ["templateId", "sampleData"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  // User Management Tools
  suspendUserAccount: {
    name: "suspendUserAccount",
    description: "Suspends a user account (Admin only, reversible)",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        reason: { type: "string", description: "Reason for suspension" },
        notifyUser: { type: "boolean", description: "Send notification to user", default: true }
      },
      required: ["userEmail", "reason"]
    },
    requiredPermissions: ["users.manage_status"],
    needsConfirmation: true
  },

  activateUserAccount: {
    name: "activateUserAccount",
    description: "Activates a suspended user account (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        notifyUser: { type: "boolean", description: "Send welcome back notification", default: true }
      },
      required: ["userEmail"]
    },
    requiredPermissions: ["users.manage_status"],
    needsConfirmation: true
  },

  assignLicense: {
    name: "assignLicense",
    description: "Assigns a license to a user (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        licenseType: { 
          type: "string", 
          enum: ["user", "user_team_leader", "program_manager", "hr_admin"],
          description: "Type of license to assign"
        },
        expirationDate: { type: "string", description: "Optional expiration date" }
      },
      required: ["userEmail", "licenseType"]
    },
    requiredPermissions: ["users.manage_licenses"],
    needsConfirmation: true
  },

  viewImpersonationHistory: {
    name: "viewImpersonationHistory",
    description: "Views impersonation history for a user (Platform Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string", description: "User to view impersonation history for" }
      },
      required: ["userEmail"]
    },
    requiredPermissions: ["security.view_impersonation_logs"],
    needsConfirmation: false
  },

  getUserLoginHistory: {
    name: "getUserLoginHistory",
    description: "Retrieves login history for a user (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        limit: { type: "number", description: "Number of records to retrieve", default: 20 }
      },
      required: ["userEmail"]
    },
    requiredPermissions: ["security.view_login_history"],
    needsConfirmation: false
  },

  terminateUserSessions: {
    name: "terminateUserSessions",
    description: "Terminates all active sessions for a user (Admin only, security action)",
    confirmationLevel: CONFIRMATION_LEVELS.CRITICAL,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        reason: { type: "string", description: "Reason for terminating sessions" }
      },
      required: ["userEmail", "reason"]
    },
    requiredPermissions: ["security.manage_sessions"],
    needsConfirmation: true
  },

  bulkInviteUsers: {
    name: "bulkInviteUsers",
    description: "Invites multiple users from a CSV file upload (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.CRITICAL,
    parameters: {
      type: "object",
      properties: {
        fileUrl: { type: "string", description: "URL of uploaded CSV file" },
        defaultRole: { type: "string", description: "Default role if not specified in CSV" },
        sendWelcomeEmail: { type: "boolean", default: true }
      },
      required: ["fileUrl"]
    },
    requiredPermissions: ["users.bulk_invite"],
    needsConfirmation: true,
    requiresFileUpload: true
  },

  // Assessment & Learning Tools
  assignAssessment: {
    name: "assignAssessment",
    description: "Assigns a custom assessment to user(s)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        assessmentId: { type: "string" },
        assessmentTitle: { type: "string" },
        userEmails: { type: "array", items: { type: "string" } },
        dueDate: { type: "string", description: "Optional due date" }
      },
      required: ["assessmentId", "userEmails"]
    },
    requiredPermissions: ["assessments.assign"],
    needsConfirmation: true
  },

  assignOnboardingPlan: {
    name: "assignOnboardingPlan",
    description: "Assigns an onboarding plan to a user",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        planId: { type: "string" },
        planTitle: { type: "string" },
        userEmail: { type: "string" },
        startDate: { type: "string", description: "Optional start date" }
      },
      required: ["planId", "userEmail"]
    },
    requiredPermissions: ["onboarding.assign"],
    needsConfirmation: true
  },

  assignCohort: {
    name: "assignCohort",
    description: "Enrolls user(s) in a cohort/program",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        cohortId: { type: "string" },
        cohortName: { type: "string" },
        userEmails: { type: "array", items: { type: "string" } }
      },
      required: ["cohortId", "userEmails"]
    },
    requiredPermissions: ["cohorts.manage"],
    needsConfirmation: true
  },

  bulkAssignAssessments: {
    name: "bulkAssignAssessments",
    description: "Assigns assessment to multiple users from CSV or team scope",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        assessmentId: { type: "string" },
        assessmentTitle: { type: "string" },
        targetType: { 
          type: "string", 
          enum: ["team", "division", "cohort", "file"],
          description: "Assignment scope"
        },
        fileUrl: { type: "string", description: "CSV file (if targetType=file)" },
        cohortId: { type: "string", description: "Cohort ID (if targetType=cohort)" },
        dueDate: { type: "string", description: "Due date for completion" },
        priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" }
      },
      required: ["assessmentId", "targetType"]
    },
    requiredPermissions: ["assessments.bulk_assign"],
    needsConfirmation: true,
    requiresFileUpload: true
  },

  assignJourneyToTeam: {
    name: "assignJourneyToTeam",
    description: "Enrolls team/cohort in a learning journey",
    confirmationLevel: CONFIRMATION_LEVELS.HIGH,
    parameters: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        journeyTitle: { type: "string" },
        targetType: { 
          type: "string", 
          enum: ["my_team", "cohort", "specific_users"],
          description: "Who to enroll"
        },
        userEmails: { type: "array", items: { type: "string" } },
        cohortId: { type: "string" },
        startDate: { type: "string", description: "Journey start date" }
      },
      required: ["journeyId", "targetType"]
    },
    requiredPermissions: ["journeys.assign"],
    needsConfirmation: true
  },

  trackLearningProgress: {
    name: "trackLearningProgress",
    description: "Shows learning completion status for user or team",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["personal", "team", "cohort"] },
        cohortId: { type: "string", description: "Required if scope=cohort" },
        includeDetails: { type: "boolean", default: false }
      },
      required: ["scope"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  suggestLearningForGaps: {
    name: "suggestLearningForGaps",
    description: "Analyzes competency gaps and recommends learning resources",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        competencyIds: { type: "array", items: { type: "string" }, description: "Specific competencies to address" },
        maxResources: { type: "number", default: 5 }
      },
      required: ["userEmail"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  // Analytics & Insights
  generateUserActivityReport: {
    name: "generateUserActivityReport",
    description: "Generates detailed activity report for a user (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        dateRange: { 
          type: "string", 
          enum: ["7days", "30days", "90days", "6months", "1year"],
          description: "Time range for the report"
        }
      },
      required: ["userEmail"]
    },
    requiredPermissions: ["analytics.view_user_activity"],
    needsConfirmation: false
  },

  identifyInactiveUsers: {
    name: "identifyInactiveUsers",
    description: "Identifies users who haven't logged in recently (Admin only)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        inactiveDays: { type: "number", description: "Days of inactivity threshold", default: 30 },
        scope: { type: "string", enum: ["org", "team", "program"], default: "org" }
      },
      required: []
    },
    requiredPermissions: ["analytics.view_engagement"],
    needsConfirmation: false
  },

  // ==================== FORM BUILDER TOOLS (6) ====================
  createFormFromDescription: {
    name: "createFormFromDescription",
    description: "AI generates complete form structure from natural language description",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        formTitle: { type: "string" },
        purpose: { type: "string", description: "e.g., 360 feedback, engagement survey" },
        targetAudience: { type: "string" },
        estimatedQuestions: { type: "number", default: 10 },
        includeScoring: { type: "boolean", default: false },
        formType: { type: "string", enum: ["feedback", "assessment", "survey", "intake"] }
      },
      required: ["formTitle", "purpose", "formType"]
    },
    requiredPermissions: ["forms.create"],
    needsConfirmation: false
  },

  suggestQuestionTypes: {
    name: "suggestQuestionTypes",
    description: "Recommends optimal question types for specific information needs",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        informationNeeded: { type: "string", description: "e.g., leadership style, satisfaction level" },
        context: { type: "string", description: "e.g., 360 feedback, post-training" },
        existingQuestions: { type: "number", default: 0 }
      },
      required: ["informationNeeded"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  designConditionalLogic: {
    name: "designConditionalLogic",
    description: "Creates branching logic for forms based on responses",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        triggerQuestion: { type: "string" },
        triggerValue: { type: "string" },
        actionType: { type: "string", enum: ["show_question", "skip_section", "end_form"] },
        targetQuestion: { type: "string" }
      },
      required: ["triggerQuestion", "triggerValue", "actionType"]
    },
    requiredPermissions: ["forms.configure"],
    needsConfirmation: false
  },

  recommendFormTemplate: {
    name: "recommendFormTemplate",
    description: "Suggests pre-built form templates from library",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        formPurpose: { type: "string" },
        industry: { type: "string" }
      },
      required: ["formPurpose"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  analyzeFormSubmissions: {
    name: "analyzeFormSubmissions",
    description: "AI analyzes form responses and identifies patterns",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        formId: { type: "string" },
        analysisType: { type: "string", enum: ["sentiment", "trends", "outliers", "summary"] },
        dateRange: { type: "string", default: "30days" }
      },
      required: ["formId", "analysisType"]
    },
    requiredPermissions: ["forms.view_submissions"],
    needsConfirmation: false
  },

  exportFormData: {
    name: "exportFormData",
    description: "Exports form submissions as CSV or PDF report",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        formId: { type: "string" },
        format: { type: "string", enum: ["csv", "pdf"] },
        includeAnalysis: { type: "boolean", default: false }
      },
      required: ["formId", "format"]
    },
    requiredPermissions: ["forms.export"],
    needsConfirmation: false
  },

  // ==================== REQUEST SYSTEM TOOLS (5) ====================
  autoTriageRequest: {
    name: "autoTriageRequest",
    description: "Analyzes request and suggests assignment + priority",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        requestDescription: { type: "string" }
      },
      required: ["requestId"]
    },
    requiredPermissions: ["requests.triage"],
    needsConfirmation: false
  },

  prioritizeRequests: {
    name: "prioritizeRequests",
    description: "Ranks pending requests by urgency, impact, and effort",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        filterBy: { type: "string", enum: ["unassigned", "my_requests", "team_requests"] },
        sortBy: { type: "string", enum: ["urgency", "impact", "effort", "smart"], default: "smart" }
      },
      required: ["filterBy"]
    },
    requiredPermissions: ["requests.view"],
    needsConfirmation: false
  },

  createInterventionPlan: {
    name: "createInterventionPlan",
    description: "Generates action plan for at-risk users or situations",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        targetUserEmails: { type: "array", items: { type: "string" } },
        riskType: { 
          type: "string", 
          enum: ["engagement", "performance", "goal_completion", "learning_stalled"]
        },
        urgency: { type: "string", enum: ["low", "medium", "high"], default: "medium" }
      },
      required: ["targetUserEmails", "riskType"]
    },
    requiredPermissions: ["interventions.create"],
    needsConfirmation: false
  },

  bulkUpdateRequestStatus: {
    name: "bulkUpdateRequestStatus",
    description: "Changes status of multiple requests at once",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        requestIds: { type: "array", items: { type: "string" } },
        newStatus: { type: "string", enum: ["assigned", "in_progress", "resolved", "closed"] },
        note: { type: "string", description: "Reason for status change" }
      },
      required: ["requestIds", "newStatus"]
    },
    requiredPermissions: ["requests.manage"],
    needsConfirmation: true
  },

  assignRequestToUser: {
    name: "assignRequestToUser",
    description: "Assigns development request to specific user",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        assigneeEmail: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        dueDate: { type: "string" }
      },
      required: ["requestId", "assigneeEmail"]
    },
    requiredPermissions: ["requests.assign"],
    needsConfirmation: true
  },

  // ==================== ADVANCED GOALS TOOLS (6) ====================
  suggestBoardLayout: {
    name: "suggestBoardLayout",
    description: "AI designs optimal goal board column structure",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        boardPurpose: { type: "string", description: "e.g., OKR tracking, Team goals, Project management" },
        teamSize: { type: "number" },
        trackingFrequency: { type: "string", enum: ["daily", "weekly", "monthly"] }
      },
      required: ["boardPurpose"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  analyzeGoalDependencies: {
    name: "analyzeGoalDependencies",
    description: "Identifies goal relationships and blocking dependencies",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["personal", "team", "org"] },
        showCriticalPath: { type: "boolean", default: false }
      },
      required: ["scope"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  suggestGoalMilestones: {
    name: "suggestGoalMilestones",
    description: "Breaks down goal into achievable milestones",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        goalId: { type: "string" },
        timeframe: { type: "string", description: "e.g., 90 days, 6 months" },
        milestoneCount: { type: "number", default: 4 }
      },
      required: ["goalId", "timeframe"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  alignGoalsToCareerPath: {
    name: "alignGoalsToCareerPath",
    description: "Suggests goals that align with user's target career path",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        targetRoleId: { type: "string" },
        timeframe: { type: "string", default: "6 months" }
      },
      required: ["userEmail", "targetRoleId"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  identifyGoalsAtRisk: {
    name: "identifyGoalsAtRisk",
    description: "Analyzes goals and flags those at risk of missing deadline",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["personal", "team"] },
        daysFromDeadline: { type: "number", default: 7 },
        includeRecommendations: { type: "boolean", default: true }
      },
      required: ["scope"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  bulkUpdateGoalProgress: {
    name: "bulkUpdateGoalProgress",
    description: "Updates progress for multiple goals (from CSV or manual)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        updates: { 
          type: "array", 
          items: {
            type: "object",
            properties: {
              goalId: { type: "string" },
              newProgress: { type: "number" }
            }
          }
        },
        fileUrl: { type: "string", description: "CSV with goalId and newProgress columns" }
      },
      required: []
    },
    requiredPermissions: ["goals.update"],
    needsConfirmation: true,
    requiresFileUpload: true
  },

  // ==================== JOURNEY & EXPERIENCE TOOLS (7) ====================
  structureJourneyPath: {
    name: "structureJourneyPath",
    description: "AI designs learning journey structure with phases and milestones",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        journeyTitle: { type: "string" },
        targetCompetencies: { type: "array", items: { type: "string" } },
        audienceLevel: { type: "string", description: "e.g., new managers, mid-level leaders" },
        durationWeeks: { type: "number" },
        includeAssessments: { type: "boolean", default: true }
      },
      required: ["journeyTitle", "targetCompetencies", "durationWeeks"]
    },
    requiredPermissions: ["journeys.create"],
    needsConfirmation: false
  },

  suggestContentGating: {
    name: "suggestContentGating",
    description: "Recommends prerequisites and content unlock criteria for a journey",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        contentDifficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
      },
      required: ["journeyId"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  selectLearningResources: {
    name: "selectLearningResources",
    description: "Finds and ranks learning resources for a journey",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        competencies: { type: "array", items: { type: "string" } },
        difficultyLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        maxResourcesPerCompetency: { type: "number", default: 3 },
        preferFreeResources: { type: "boolean", default: false }
      },
      required: ["competencies"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  addJourneyMilestones: {
    name: "addJourneyMilestones",
    description: "Adds milestone checkpoints to learning journey",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              weekNumber: { type: "number" },
              requiredResources: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      required: ["journeyId", "milestones"]
    },
    requiredPermissions: ["journeys.edit"],
    needsConfirmation: true
  },

  analyzeJourneyEffectiveness: {
    name: "analyzeJourneyEffectiveness",
    description: "Analyzes journey completion rates and impact on competencies",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        includeCompetencyGrowth: { type: "boolean", default: true }
      },
      required: ["journeyId"]
    },
    requiredPermissions: ["analytics.view_journeys"],
    needsConfirmation: false
  },

  cloneJourneyAsTemplate: {
    name: "cloneJourneyAsTemplate",
    description: "Creates reusable template from existing journey",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        journeyId: { type: "string" },
        templateName: { type: "string" },
        makePublic: { type: "boolean", default: false }
      },
      required: ["journeyId", "templateName"]
    },
    requiredPermissions: ["journeys.create_template"],
    needsConfirmation: true
  },

  enrollUserInExperience: {
    name: "enrollUserInExperience",
    description: "Enrolls user in any experience type (journey, cohort, onboarding)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        experienceType: { type: "string", enum: ["journey", "cohort", "onboarding", "assessment"] },
        experienceId: { type: "string" },
        startDate: { type: "string" }
      },
      required: ["userEmail", "experienceType", "experienceId"]
    },
    requiredPermissions: ["experiences.assign"],
    needsConfirmation: true
  },

  // ==================== ANALYTICS DASHBOARD TOOLS (8) ====================
  interpretDashboardMetrics: {
    name: "interpretDashboardMetrics",
    description: "Provides AI analysis of current dashboard metrics",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        dashboardType: { type: "string", enum: ["assessment", "learning", "goals", "leadership_index"] },
        metricSnapshot: { type: "object", description: "Current visible metrics" },
        compareToBaseline: { type: "boolean", default: false }
      },
      required: ["dashboardType", "metricSnapshot"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  identifyOutliers: {
    name: "identifyOutliers",
    description: "Finds statistical outliers in performance data",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        dataType: { type: "string", enum: ["assessment_scores", "goal_completion", "learning_engagement"] },
        scope: { type: "string", enum: ["team", "org", "division"] },
        threshold: { type: "string", enum: ["2_std_dev", "top_5_percent", "bottom_5_percent"] }
      },
      required: ["dataType", "scope"]
    },
    requiredPermissions: ["analytics.view_advanced"],
    needsConfirmation: false
  },

  compareDepartments: {
    name: "compareDepartments",
    description: "Compares performance metrics across departments",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["avg_score", "completion_rate", "engagement", "goal_attainment"] },
        departments: { type: "array", items: { type: "string" }, description: "Department names or 'all'" },
        timeRange: { type: "string", default: "90days" }
      },
      required: ["metric"]
    },
    requiredPermissions: ["analytics.compare_departments"],
    needsConfirmation: false
  },

  detectTrends: {
    name: "detectTrends",
    description: "Identifies upward/downward trends over time",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string" },
        scope: { type: "string", enum: ["personal", "team", "org"] },
        lookbackMonths: { type: "number", default: 3 },
        alertOnDecline: { type: "boolean", default: true }
      },
      required: ["metric", "scope"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  generateBenchmarkReport: {
    name: "generateBenchmarkReport",
    description: "Compares org metrics to industry benchmarks",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        industry: { type: "string" },
        includeCompetencyBreakdown: { type: "boolean", default: true },
        format: { type: "string", enum: ["pdf", "presentation"], default: "pdf" }
      },
      required: ["industry"]
    },
    requiredPermissions: ["analytics.benchmarks"],
    needsConfirmation: false
  },

  explainMetricChange: {
    name: "explainMetricChange",
    description: "AI explains why a metric changed (root cause analysis)",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string" },
        changePercentage: { type: "number" },
        timeframe: { type: "string" }
      },
      required: ["metric", "changePercentage", "timeframe"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  forecastMetric: {
    name: "forecastMetric",
    description: "Predicts future metric values based on trends",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string" },
        forecastMonths: { type: "number", default: 3 },
        confidenceLevel: { type: "boolean", default: true }
      },
      required: ["metric"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  identifyInterventionOpportunities: {
    name: "identifyInterventionOpportunities",
    description: "Finds where interventions would have highest impact",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["team", "org", "division"] },
        focusArea: { type: "string", enum: ["engagement", "performance", "retention"] }
      },
      required: ["scope", "focusArea"]
    },
    requiredPermissions: ["analytics.view_advanced"],
    needsConfirmation: false
  },

  // ==================== COMPETENCY MANAGEMENT TOOLS (5) ====================
  createCompetency: {
    name: "createCompetency",
    description: "Guides creation of custom competency with AI assistance",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        competencyName: { type: "string" },
        category: { type: "string" },
        leadershipLevels: { type: "array", items: { type: "string" } },
        evidenceBased: { type: "boolean", description: "Include research citations", default: false }
      },
      required: ["competencyName", "category", "leadershipLevels"]
    },
    requiredPermissions: ["competencies.create"],
    needsConfirmation: false
  },

  mapCompetencyToAssessment: {
    name: "mapCompetencyToAssessment",
    description: "Links competency to assessment questions for scoring",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        competencyId: { type: "string" },
        assessmentId: { type: "string" },
        suggestQuestions: { type: "boolean", default: true }
      },
      required: ["competencyId", "assessmentId"]
    },
    requiredPermissions: ["competencies.configure"],
    needsConfirmation: false
  },

  defineCompetencyLevels: {
    name: "defineCompetencyLevels",
    description: "Creates proficiency level descriptions with behavioral anchors",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        competencyName: { type: "string" },
        numberOfLevels: { type: "number", default: 4 },
        includeExamples: { type: "boolean", default: true }
      },
      required: ["competencyName"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  linkCompetenciesToRole: {
    name: "linkCompetenciesToRole",
    description: "Defines required competency levels for a role",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        roleId: { type: "string" },
        competencyIds: { type: "array", items: { type: "string" } },
        targetScores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              competencyId: { type: "string" },
              minScore: { type: "number" }
            }
          }
        }
      },
      required: ["roleId", "competencyIds"]
    },
    requiredPermissions: ["roles.configure"],
    needsConfirmation: true
  },

  suggestCompetencyDevelopment: {
    name: "suggestCompetencyDevelopment",
    description: "Recommends development activities for competency improvement",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        competencyId: { type: "string" },
        currentScore: { type: "number" },
        targetScore: { type: "number" },
        timeframe: { type: "string" }
      },
      required: ["competencyId", "currentScore", "targetScore"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  // ==================== CERTIFICATION & EXTERNAL ASSESSMENT TOOLS (4) ====================
  verifyCertification: {
    name: "verifyCertification",
    description: "Guides admin through certification verification process",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        certificationName: { type: "string" },
        issuingBody: { type: "string" },
        verificationUrl: { type: "string" }
      },
      required: ["userEmail", "certificationName", "issuingBody"]
    },
    requiredPermissions: ["certifications.verify"],
    needsConfirmation: true
  },

  processExternalAssessment: {
    name: "processExternalAssessment",
    description: "Imports external assessment results (DiSC, MBTI, etc.)",
    confirmationLevel: CONFIRMATION_LEVELS.MEDIUM,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        assessmentType: { 
          type: "string", 
          enum: ["DiSC", "MBTI", "CliftonStrengths", "360_feedback", "other"]
        },
        fileUrl: { type: "string", description: "PDF/image of results" },
        keyFindings: { type: "string" }
      },
      required: ["userEmail", "assessmentType", "fileUrl"]
    },
    requiredPermissions: ["assessments.manage_external"],
    needsConfirmation: true,
    requiresFileUpload: true
  },

  recommendCareerPathFromCerts: {
    name: "recommendCareerPathFromCerts",
    description: "Suggests career paths based on certifications and external assessments",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        userEmail: { type: "string" },
        includeGapAnalysis: { type: "boolean", default: true }
      },
      required: ["userEmail"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  },

  setCertificationReminder: {
    name: "setCertificationReminder",
    description: "Creates renewal reminder for expiring certifications",
    confirmationLevel: CONFIRMATION_LEVELS.LOW,
    parameters: {
      type: "object",
      properties: {
        certificationId: { type: "string" },
        expirationDate: { type: "string" },
        reminderDaysBefore: { type: "number", default: 90 }
      },
      required: ["certificationId", "expirationDate"]
    },
    requiredPermissions: [],
    needsConfirmation: false
  }
};

// ==================== WORKFLOW CHAIN METADATA ====================
// Defines which tools trigger workflow suggestions after execution
export const WORKFLOW_CHAINS = {
  inviteUser: ['assignOnboardingPlan', 'bulkAssignAssessments', 'enrollUserInExperience'],
  bulkInviteUsers: ['bulkAssignOnboardingPlans', 'sendEmail'],
  suspendUserAccount: ['sendEmail', 'bulkUpdateGoalProgress'],
  setAccountExpiration: ['sendEmail', 'bulkUpdateGoalProgress'],
  assignLearning: ['scheduleNotification', 'createReminder'],
  bulkAssignLearning: ['scheduleNotification', 'createReminder'],
  createGoal: ['suggestLearningForGaps', 'suggestGoalMilestones'],
  bulkCreateGoals: ['suggestLearningForGaps', 'suggestGoalMilestones'],
  cascadeGoal: ['sendEmail', 'identifyGoalsAtRisk'],
  verifyCertification: ['recommendCareerPathFromCerts', 'setCertificationReminder'],
  processExternalAssessment: ['recommendCareerPathFromCerts'],
  assignOnboardingPlan: ['bulkAssignAssessments', 'sendEmail'],
  bulkAssignAssessments: ['scheduleCalendarEvent', 'createReminder'],
  assignJourneyToTeam: ['analyzeJourneyEffectiveness'],
  autoTriageRequest: ['assignRequestToUser'],
  identifyGoalsAtRisk: ['createInterventionPlan', 'createReminder'],
  suggestLearningForGaps: ['assignLearning'],
  interpretDashboardMetrics: ['identifyInterventionOpportunities'],
  explainMetricChange: ['identifyInterventionOpportunities'],
  designBadgeStructure: ['createBadgeTemplate'],
  createCompetency: ['mapCompetencyToAssessment', 'linkCompetenciesToRole']
};

// Helper: Get suggested workflow chains after tool execution
export function getWorkflowChain(completedTool) {
  return WORKFLOW_CHAINS[completedTool] || [];
}

// Permission mappings to role permissions
export const getToolsForUser = (userPermissions = [], userRole = null) => {
  const availableTools = {};
  // Normalize: permissions may arrive as an object (permission map) or array of strings
  const permArray = Array.isArray(userPermissions)
    ? userPermissions
    : Object.keys(userPermissions || {}).filter(k => userPermissions[k]);

  Object.entries(AGENT_TOOLS).forEach(([toolName, toolDef]) => {
    // Platform Admin has all permissions
    if (userRole === 'Platform Admin') {
      availableTools[toolName] = toolDef;
      return;
    }

    // Check if user has required permissions
    if (!toolDef.requiredPermissions || toolDef.requiredPermissions.length === 0) {
      availableTools[toolName] = toolDef;
      return;
    }

    const hasPermission = toolDef.requiredPermissions.every(perm => 
      permArray.includes(perm) || permArray.includes('*')
    );

    if (hasPermission) {
      availableTools[toolName] = toolDef;
    }
  });

  return availableTools;
};

// Get tools that support file upload
export const getFileUploadTools = () => {
  return Object.entries(AGENT_TOOLS)
    .filter(([_, toolDef]) => toolDef.requiresFileUpload)
    .map(([toolName, _]) => toolName);
};
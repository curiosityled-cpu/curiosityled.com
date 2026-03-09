// UAT Test Cases organized by role
export const TEST_CASES_BY_ROLE = {
  "User Level 1": [
    {
      id: "U_UC-1.1",
      feature_area: "Dashboard & Navigation",
      title: "First Login & Welcome Dashboard",
      description: "Verify the initial dashboard experience for a new user logging in for the first time.",
      steps: [
        "Log in to the platform for the first time",
        "Observe the dashboard layout and welcome message",
        "Check for presence of key sections: Assessment overview, Goals, Learning recommendations",
        "Verify navigation menu is accessible"
      ],
      expected_results: [
        "Welcome message displays with user's name",
        "Dashboard loads without errors",
        "All sections are visible and properly formatted",
        "Navigation menu works correctly"
      ],
      navigate_to: "Dashboard"
    },
    {
      id: "U_UC-1.2",
      feature_area: "Dashboard & Navigation",
      title: "Navigate Between Sections",
      description: "Test navigation between different platform sections using the main menu.",
      steps: [
        "Click on each main navigation item (Dashboard, Experiences, Assessments, Development, Performance, Insights, Reports)",
        "Verify each page loads correctly",
        "Use browser back button to return",
        "Test mobile menu if on mobile device"
      ],
      expected_results: [
        "All navigation items are clickable",
        "Pages load without errors",
        "Back button works correctly",
        "Active menu item is highlighted"
      ],
      navigate_to: "Dashboard"
    },
    {
      id: "U_UC-2.1",
      feature_area: "Assessments",
      title: "View Available Assessments",
      description: "Access and view the list of assessments available to the user.",
      steps: [
        "Navigate to Assessments section",
        "View list of available assessments",
        "Check assessment descriptions and details",
        "Verify any assigned assessments are marked"
      ],
      expected_results: [
        "Assessment list displays correctly",
        "All assessments show proper metadata",
        "Assigned assessments are clearly indicated",
        "No loading errors"
      ],
      navigate_to: "Assessments"
    },
    {
      id: "U_UC-2.2",
      feature_area: "Assessments",
      title: "Complete Leadership Assessment",
      description: "Take and complete the leadership assessment from start to finish.",
      steps: [
        "Select the Leadership Assessment",
        "Start the assessment",
        "Answer all questions (use realistic responses)",
        "Submit the assessment",
        "View results page"
      ],
      expected_results: [
        "Assessment starts without errors",
        "All questions load properly",
        "Progress indicator works",
        "Results display after submission",
        "Scores and insights are visible"
      ],
      navigate_to: "LeadershipAssessment"
    },
    {
      id: "U_UC-3.1",
      feature_area: "Learning & Development",
      title: "Browse Learning Library",
      description: "Explore the learning resources library and filter options.",
      steps: [
        "Navigate to Development > Learning Library",
        "Browse available resources",
        "Test filter by competency",
        "Test filter by level",
        "Search for a specific topic"
      ],
      expected_results: [
        "All learning resources display",
        "Filters work correctly",
        "Search returns relevant results",
        "Resource details are accessible"
      ],
      navigate_to: "LearningLibrary"
    },
    {
      id: "U_UC-3.2",
      feature_area: "Learning & Development",
      title: "View Career Path Options",
      description: "Explore career paths and view development suggestions.",
      steps: [
        "Navigate to Development > Career Paths",
        "View available career paths",
        "Click on a career path to see details",
        "Review required competencies and timeline"
      ],
      expected_results: [
        "Career paths display correctly",
        "Path details are comprehensive",
        "Readiness scores show if assessment completed",
        "Recommendations are relevant"
      ],
      navigate_to: "CareerPathExplorer"
    },
    {
      id: "U_UC-4.1",
      feature_area: "Goals & Performance",
      title: "Create Personal Goal",
      description: "Create a new personal development goal.",
      steps: [
        "Navigate to Performance section",
        "Click 'Create Goal' or similar button",
        "Fill in goal title and description",
        "Set target date",
        "Link to a competency if possible",
        "Save the goal"
      ],
      expected_results: [
        "Goal creation form opens",
        "All fields work properly",
        "Goal saves successfully",
        "Goal appears in the list"
      ],
      navigate_to: "Performance"
    },
    {
      id: "U_UC-4.2",
      feature_area: "Goals & Performance",
      title: "Update Goal Progress",
      description: "Edit an existing goal and update its progress.",
      steps: [
        "Navigate to your goals list",
        "Select a goal to edit",
        "Update progress percentage or status",
        "Add a progress note",
        "Save changes"
      ],
      expected_results: [
        "Goal details load correctly",
        "Progress can be updated",
        "Changes save successfully",
        "Updated progress reflects in the UI"
      ],
      navigate_to: "Performance"
    },
    {
      id: "U_UC-5.1",
      feature_area: "Profile & Settings",
      title: "View and Edit Profile",
      description: "Access profile page and update personal information.",
      steps: [
        "Click on user menu/avatar",
        "Navigate to Profile",
        "Review current profile information",
        "Edit a field (e.g., display name, bio)",
        "Save changes"
      ],
      expected_results: [
        "Profile page loads with correct data",
        "Edit mode activates",
        "Changes save successfully",
        "Success message appears"
      ],
      navigate_to: "Profile"
    },
    {
      id: "U_UC-5.2",
      feature_area: "Profile & Settings",
      title: "Upload External Certification",
      description: "Add a certification or external assessment to profile.",
      steps: [
        "Go to Profile > Certifications section",
        "Click 'Add Certification'",
        "Fill in certification details",
        "Upload certificate file",
        "Submit for verification"
      ],
      expected_results: [
        "Add form opens correctly",
        "File upload works",
        "Submission succeeds",
        "Certification appears with 'pending' status"
      ],
      navigate_to: "Profile"
    },
    {
      id: "U_UC-6.1",
      feature_area: "Notifications",
      title: "View Notifications",
      description: "Access and interact with notification center.",
      steps: [
        "Click on notifications bell icon",
        "View list of notifications",
        "Click on a notification to mark as read",
        "Check if notification count updates"
      ],
      expected_results: [
        "Notifications dropdown opens",
        "All recent notifications display",
        "Clicking marks as read",
        "Unread count decreases"
      ],
      navigate_to: "Notifications"
    },
    {
      id: "U_UC-7.1",
      feature_area: "AI Coach - Atreus",
      title: "Basic Interaction with Atreus",
      description: "Test basic AI coach functionality.",
      steps: [
        "Click the Atreus (AI coach) button",
        "Type a question about your development",
        "Send the message",
        "Review the response",
        "Ask a follow-up question"
      ],
      expected_results: [
        "Atreus interface opens",
        "Message sends successfully",
        "Response is relevant and helpful",
        "Conversation history persists",
        "Follow-up maintains context"
      ],
      navigate_to: "Dashboard"
    }
  ],
  "User Level 2": [
    {
      id: "TL_UC-1.1",
      feature_area: "Dashboard & Navigation",
      title: "Team Leader Dashboard Overview",
      description: "View and navigate the Team Leader-specific dashboard.",
      steps: [
        "Log in as a Team Leader",
        "View dashboard with team toggle",
        "Toggle to 'Team View'",
        "Observe team metrics and insights",
        "Check for direct report information"
      ],
      expected_results: [
        "Team toggle is visible and functional",
        "Team metrics display correctly",
        "Direct reports list is accurate",
        "No data loading errors"
      ],
      navigate_to: "Dashboard"
    },
    {
      id: "TL_UC-2.1",
      feature_area: "Team Management",
      title: "View Team Member Profiles",
      description: "Access and review direct reports' information.",
      steps: [
        "Navigate to team member list",
        "Click on a team member",
        "Review their profile, assessments, and goals",
        "Check competency scores if available"
      ],
      expected_results: [
        "Team member list displays all reports",
        "Individual profiles load correctly",
        "Assessment results are visible",
        "Goal progress is shown"
      ],
      navigate_to: "CommandCenter"
    },
    {
      id: "TL_UC-3.1",
      feature_area: "Goals & Performance",
      title: "Assign Goal to Team Member",
      description: "Create and assign a goal to a direct report.",
      steps: [
        "Navigate to Performance > Team view",
        "Select 'Assign Goal' or similar",
        "Choose team member",
        "Fill in goal details",
        "Assign the goal"
      ],
      expected_results: [
        "Team member selector works",
        "Goal form opens correctly",
        "Goal assigns successfully",
        "Team member receives notification"
      ],
      navigate_to: "Performance"
    },
    {
      id: "TL_UC-4.1",
      feature_area: "Learning & Development",
      title: "Assign Learning Resource",
      description: "Assign a learning resource to a team member.",
      steps: [
        "Go to Development > Team Learning",
        "Select 'Assign Learning'",
        "Choose team member",
        "Select a learning resource",
        "Set optional due date",
        "Assign"
      ],
      expected_results: [
        "Assignment flow works smoothly",
        "Resource assigns successfully",
        "Team member is notified",
        "Assignment appears in their view"
      ],
      navigate_to: "TeamLearning"
    },
    {
      id: "TL_UC-5.1",
      feature_area: "Team Insights",
      title: "Review Team Analytics",
      description: "View team-level performance and engagement analytics.",
      steps: [
        "Navigate to Insights > Team view",
        "Review team competency distribution",
        "Check engagement metrics",
        "View assessment completion rates"
      ],
      expected_results: [
        "Team analytics display correctly",
        "Charts and graphs render properly",
        "Data is up-to-date",
        "Insights are actionable"
      ],
      navigate_to: "Insights"
    }
  ],
  "Admin Level 1": [
    {
      id: "PA_UC-1.1",
      feature_area: "Program Management",
      title: "View Assigned Programs",
      description: "Access and review programs managed by the admin.",
      steps: [
        "Log in as Program Administrator",
        "Navigate to programs section",
        "View list of managed programs",
        "Click on a program to see details"
      ],
      expected_results: [
        "All assigned programs display",
        "Program details load correctly",
        "Participant counts are accurate",
        "Analytics are visible"
      ],
      navigate_to: "CommandCenter"
    },
    {
      id: "PA_UC-2.1",
      feature_area: "Participant Management",
      title: "Add Participants to Program",
      description: "Enroll users into a cohort or program.",
      steps: [
        "Navigate to program participants",
        "Click 'Add Participants'",
        "Select users from list",
        "Confirm enrollment",
        "Verify participants are added"
      ],
      expected_results: [
        "User selection interface works",
        "Enrollment succeeds",
        "Participants appear in program",
        "Notifications sent to new participants"
      ],
      navigate_to: "CommandCenter"
    },
    {
      id: "PA_UC-3.1",
      feature_area: "Journey Management",
      title: "Create Learning Journey",
      description: "Build a new learning journey for program participants.",
      steps: [
        "Go to Journey Builder",
        "Create new journey",
        "Add milestones and resources",
        "Set prerequisites if needed",
        "Save journey"
      ],
      expected_results: [
        "Journey builder opens",
        "All configuration options work",
        "Journey saves successfully",
        "Journey is assignable to cohorts"
      ],
      navigate_to: "JourneyBuilder"
    },
    {
      id: "PA_UC-4.1",
      feature_area: "Program Analytics",
      title: "Review Program Performance",
      description: "Access program-level analytics and reports.",
      steps: [
        "Navigate to Program Analytics",
        "Review completion rates",
        "Check participant engagement",
        "View competency improvements"
      ],
      expected_results: [
        "Analytics dashboard loads",
        "All metrics display correctly",
        "Charts are interactive",
        "Export options work"
      ],
      navigate_to: "CommandCenter"
    }
  ],
  "Admin Level 2": [
    {
      id: "HR_UC-1.1",
      feature_area: "User Management",
      title: "Bulk User Import",
      description: "Upload and import multiple users via CSV.",
      steps: [
        "Navigate to User Management",
        "Click 'Bulk Upload'",
        "Download CSV template",
        "Fill template with test users",
        "Upload CSV",
        "Review import results"
      ],
      expected_results: [
        "Template downloads correctly",
        "Upload accepts valid CSV",
        "Users import successfully",
        "Error validation works for invalid data"
      ],
      navigate_to: "UserManagement"
    },
    {
      id: "HR_UC-2.1",
      feature_area: "Competency Management",
      title: "Create Custom Competency",
      description: "Define a new competency framework for the organization.",
      steps: [
        "Go to Competency Management",
        "Create new competency",
        "Define proficiency levels",
        "Link to assessments",
        "Save competency"
      ],
      expected_results: [
        "Competency creation form works",
        "All fields save correctly",
        "Competency appears in library",
        "Can be used in assessments/goals"
      ],
      navigate_to: "CompetencyManagement"
    },
    {
      id: "HR_UC-3.1",
      feature_area: "Certification Review",
      title: "Verify User Certifications",
      description: "Review and approve pending certification submissions.",
      steps: [
        "Navigate to Qualifications Review",
        "View pending certifications",
        "Click on a certification",
        "Review uploaded document",
        "Approve or reject with reason"
      ],
      expected_results: [
        "Pending list displays correctly",
        "Documents open properly",
        "Approval/rejection processes",
        "User receives notification"
      ],
      navigate_to: "QualificationsReview"
    },
    {
      id: "HR_UC-4.1",
      feature_area: "Organizational Analytics",
      title: "View Org-Wide Reports",
      description: "Access comprehensive organizational analytics.",
      steps: [
        "Navigate to Analytics dashboard",
        "Review organization view",
        "Check skill gaps analysis",
        "View succession readiness",
        "Export a report"
      ],
      expected_results: [
        "All org-level metrics display",
        "Charts render correctly",
        "Data is current",
        "Export generates successfully"
      ],
      navigate_to: "Analytics"
    }
  ],
  "Platform Admin": [
    {
      id: "PLAT_UC-1.1",
      feature_area: "Platform Administration",
      title: "Access Platform Admin Portal",
      description: "Navigate and explore platform administration features.",
      steps: [
        "Log in as Platform Admin",
        "Access all admin areas",
        "Review platform settings",
        "Check user impersonation feature"
      ],
      expected_results: [
        "Full platform access granted",
        "All admin menus visible",
        "Settings load correctly",
        "Impersonation works"
      ],
      navigate_to: "Dashboard"
    },
    {
      id: "PLAT_UC-2.1",
      feature_area: "UAT Management",
      title: "Assign UAT Testers",
      description: "Manage UAT tester assignments for new release cycle.",
      steps: [
        "Navigate to UAT Admin Dashboard",
        "Click 'Add UAT Testers'",
        "Select users across different roles",
        "Assign to current UAT cycle",
        "Verify assignments"
      ],
      expected_results: [
        "UAT dashboard loads",
        "User selection works",
        "Assignments save successfully",
        "Users receive UAT access"
      ],
      navigate_to: "UATAdminDashboard"
    },
    {
      id: "PLAT_UC-3.1",
      feature_area: "UAT Submission Review",
      title: "Review UAT Test Results",
      description: "Analyze submitted UAT test results and identify issues.",
      steps: [
        "Go to UAT Admin Dashboard",
        "Review submission statistics",
        "Filter by severity",
        "Click on a critical issue",
        "Review details and evidence",
        "Export submissions to CSV"
      ],
      expected_results: [
        "All submissions display",
        "Filters work correctly",
        "Issue details are complete",
        "CSV export includes all data"
      ],
      navigate_to: "UATAdminDashboard"
    }
  ]
};

// Get test cases for a specific role
export const getTestCasesForRole = (role) => {
  return TEST_CASES_BY_ROLE[role] || [];
};

// Get all test cases across all roles
export const getAllTestCases = () => {
  return Object.values(TEST_CASES_BY_ROLE).flat();
};

// Get test case by ID
export const getTestCaseById = (id) => {
  const allCases = getAllTestCases();
  return allCases.find(tc => tc.id === id);
};
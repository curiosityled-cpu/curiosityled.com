/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccessDenied from './pages/AccessDenied';
import Achievements from './pages/Achievements';
import ActivateAccount from './pages/ActivateAccount';
import AssessmentDetails from './pages/AssessmentDetails';
import AssessmentResults from './pages/AssessmentResults';
import Assessments from './pages/Assessments';
import Automations from './pages/Automations';
import Billing from './pages/Billing';
import BulkLearningOperations from './pages/BulkLearningOperations';
import BusinessManager from './pages/BusinessManager';
import CareerPathCreator from './pages/CareerPathCreator';
import CareerPathDetails from './pages/CareerPathDetails';
import CareerPathExplorer from './pages/CareerPathExplorer';
import CommandCenter from './pages/CommandCenter';
import CompetencyManagement from './pages/CompetencyManagement';
import ConfigureHealthCoUsers from './pages/ConfigureHealthCoUsers';
import ConversationalModule from './pages/ConversationalModule';
import ConversationalModuleBuilder from './pages/ConversationalModuleBuilder';
import ConversationalModulesLibrary from './pages/ConversationalModulesLibrary';
import CustomAssessmentBuilder from './pages/CustomAssessmentBuilder';
import EmailTemplates from './pages/EmailTemplates';
import EnableUATTesting from './pages/EnableUATTesting';
import FirstLoginPasswordReset from './pages/FirstLoginPasswordReset';
import FormBuilder from './pages/FormBuilder';
import FormBuilderDashboard from './pages/FormBuilderDashboard';
import FormSubmission from './pages/FormSubmission';
import FormSubmissions from './pages/FormSubmissions';
import GamificationManager from './pages/GamificationManager';
import GamificationTesting from './pages/GamificationTesting';
import Goal from './pages/Goal';
import GoalBoard from './pages/GoalBoard';
import HRAssessmentDashboard from './pages/HRAssessmentDashboard';
import Insights from './pages/Insights';
import IntegrationContracts from './pages/IntegrationContracts';
import JourneyBuilder from './pages/JourneyBuilder';
import JourneyDetails from './pages/JourneyDetails';
import LeadershipAssessment from './pages/LeadershipAssessment';
import LeadershipIndexAdmin from './pages/LeadershipIndexAdmin';
import LeadershipIndexAssessment from './pages/LeadershipIndexAssessment';
import LearningLibrary from './pages/LearningLibrary';
import MyOnboarding from './pages/MyOnboarding';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import OnboardingPlanBuilder from './pages/OnboardingPlanBuilder';
import PartnerPortal from './pages/PartnerPortal';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import ProvisioningBatchDetail from './pages/ProvisioningBatchDetail';
import ProvisioningBatches from './pages/ProvisioningBatches';
import ProvisioningManualValidationPack from './pages/ProvisioningManualValidationPack';
import ProvisioningOpsDashboard from './pages/ProvisioningOpsDashboard';
import ProvisioningValidation from './pages/ProvisioningValidation';
import ProvisioningWixReadinessReport from './pages/ProvisioningWixReadinessReport';
import PublicFormSubmission from './pages/PublicFormSubmission';
import PublicRequestSubmission from './pages/PublicRequestSubmission';
import QualificationsReview from './pages/QualificationsReview';
import QuestionBankImport from './pages/QuestionBankImport';
import QuestionBankManager from './pages/QuestionBankManager';
import QuestionEditor from './pages/QuestionEditor';
import ReportBuilder from './pages/ReportBuilder';
import RoleManagement from './pages/RoleManagement';
import RoleSelector from './pages/RoleSelector';
import Settings from './pages/Settings';
import SuperAdminPortal from './pages/SuperAdminPortal';
import TeamCareerPaths from './pages/TeamCareerPaths';
import TermsOfService from './pages/TermsOfService';
import UATAdminDashboard from './pages/UATAdminDashboard';
import UATTestingGuide from './pages/UATTestingGuide';
import UserManagement from './pages/UserManagement';
import WhiteLabel from './pages/WhiteLabel';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessDenied": AccessDenied,
    "Achievements": Achievements,
    "ActivateAccount": ActivateAccount,
    "AssessmentDetails": AssessmentDetails,
    "AssessmentResults": AssessmentResults,
    "Assessments": Assessments,
    "Automations": Automations,
    "Billing": Billing,
    "BulkLearningOperations": BulkLearningOperations,
    "BusinessManager": BusinessManager,
    "CareerPathCreator": CareerPathCreator,
    "CareerPathDetails": CareerPathDetails,
    "CareerPathExplorer": CareerPathExplorer,
    "CommandCenter": CommandCenter,
    "CompetencyManagement": CompetencyManagement,
    "ConfigureHealthCoUsers": ConfigureHealthCoUsers,
    "ConversationalModule": ConversationalModule,
    "ConversationalModuleBuilder": ConversationalModuleBuilder,
    "ConversationalModulesLibrary": ConversationalModulesLibrary,
    "CustomAssessmentBuilder": CustomAssessmentBuilder,
    "EmailTemplates": EmailTemplates,
    "EnableUATTesting": EnableUATTesting,
    "FirstLoginPasswordReset": FirstLoginPasswordReset,
    "FormBuilder": FormBuilder,
    "FormBuilderDashboard": FormBuilderDashboard,
    "FormSubmission": FormSubmission,
    "FormSubmissions": FormSubmissions,
    "GamificationManager": GamificationManager,
    "GamificationTesting": GamificationTesting,
    "Goal": Goal,
    "GoalBoard": GoalBoard,
    "HRAssessmentDashboard": HRAssessmentDashboard,
    "Insights": Insights,
    "IntegrationContracts": IntegrationContracts,
    "JourneyBuilder": JourneyBuilder,
    "JourneyDetails": JourneyDetails,
    "LeadershipAssessment": LeadershipAssessment,
    "LeadershipIndexAdmin": LeadershipIndexAdmin,
    "LeadershipIndexAssessment": LeadershipIndexAssessment,
    "LearningLibrary": LearningLibrary,
    "MyOnboarding": MyOnboarding,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "OnboardingPlanBuilder": OnboardingPlanBuilder,
    "PartnerPortal": PartnerPortal,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "ProvisioningBatchDetail": ProvisioningBatchDetail,
    "ProvisioningBatches": ProvisioningBatches,
    "ProvisioningManualValidationPack": ProvisioningManualValidationPack,
    "ProvisioningOpsDashboard": ProvisioningOpsDashboard,
    "ProvisioningValidation": ProvisioningValidation,
    "ProvisioningWixReadinessReport": ProvisioningWixReadinessReport,
    "PublicFormSubmission": PublicFormSubmission,
    "PublicRequestSubmission": PublicRequestSubmission,
    "QualificationsReview": QualificationsReview,
    "QuestionBankImport": QuestionBankImport,
    "QuestionBankManager": QuestionBankManager,
    "QuestionEditor": QuestionEditor,
    "ReportBuilder": ReportBuilder,
    "RoleManagement": RoleManagement,
    "RoleSelector": RoleSelector,
    "Settings": Settings,
    "SuperAdminPortal": SuperAdminPortal,
    "TeamCareerPaths": TeamCareerPaths,
    "TermsOfService": TermsOfService,
    "UATAdminDashboard": UATAdminDashboard,
    "UATTestingGuide": UATTestingGuide,
    "UserManagement": UserManagement,
    "WhiteLabel": WhiteLabel,
}

export const pagesConfig = {
    mainPage: null,
    Pages: PAGES,
    Layout: __Layout,
};
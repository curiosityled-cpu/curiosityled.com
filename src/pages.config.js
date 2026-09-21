/**
 * pages.config.js - Page routing configuration
 *
 * This file is NO LONGER auto-generated. Pages are registered here for the
 * legacy routing loop in App.jsx. New MVP pages are added as explicit
 * <Route> elements in App.jsx instead.
 *
 * The only editable values: mainPage and the PAGES object.
 * mainPage controls which page is the landing page (shown when users visit the app).
 */
import Achievements from './pages/Achievements';
import AssessmentAnalyticsDashboard from './pages/AssessmentAnalyticsDashboard';
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
import ConversationalModule from './pages/ConversationalModule';
import ConversationalModuleBuilder from './pages/ConversationalModuleBuilder';
import ConversationalModulesLibrary from './pages/ConversationalModulesLibrary';
import CustomAssessmentBuilder from './pages/CustomAssessmentBuilder';
import Dashboard from './pages/Dashboard';
import Development from './pages/Development';
import EmailTemplates from './pages/EmailTemplates';
import ExperienceAnalytics from './pages/ExperienceAnalytics';
import ExperienceManagement from './pages/ExperienceManagement';
import DevelopmentManager from './pages/ExperienceManagement';
import FormBuilder from './pages/FormBuilder';
import FormBuilderDashboard from './pages/FormBuilderDashboard';
import FormSubmission from './pages/FormSubmission';
import FormSubmissions from './pages/FormSubmissions';
import Goal from './pages/Goal';
import HRAssessmentDashboard from './pages/HRAssessmentDashboard';
import Home from './pages/Home';
import Insights from './pages/Insights';
import JourneyBuilder from './pages/JourneyBuilder';
import JourneyDetails from './pages/JourneyDetails';
import LeadershipAssessment from './pages/LeadershipAssessment';
import LearningAnalyticsDashboard from './pages/LearningAnalyticsDashboard';
import LearningLibrary from './pages/LearningLibrary';
import MyExperiences from './pages/MyExperiences';
import MyJourneys from './pages/MyJourneys';
import MyLearning from './pages/MyLearning';
import MyOnboarding from './pages/MyOnboarding';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import OnboardingPlanBuilder from './pages/OnboardingPlanBuilder';
import OrgPerformance from './pages/OrgPerformance';
import Performance from './pages/Performance';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import ProvisioningBatchDetail from './pages/ProvisioningBatchDetail';
import ProvisioningBatches from './pages/ProvisioningBatches';
import PublicFormSubmission from './pages/PublicFormSubmission';
import PublicRequestSubmission from './pages/PublicRequestSubmission';
import QualificationsReview from './pages/QualificationsReview';
import QuestionBankImport from './pages/QuestionBankImport';
import QuestionEditor from './pages/QuestionEditor';
import ReportBuilder from './pages/ReportBuilder';
import RequestDashboard from './pages/RequestDashboard';
import RoleSelector from './pages/RoleSelector';
import Settings from './pages/Settings';
import TeamCareerPaths from './pages/TeamCareerPaths';
import TeamExperiences from './pages/TeamExperiences';
import TeamLearning from './pages/TeamLearning';
import TermsOfService from './pages/TermsOfService';
import UATAdminDashboard from './pages/UATAdminDashboard';
import UATTestingGuide from './pages/UATTestingGuide';
import UserManagement from './pages/UserManagement';
import WhiteLabel from './pages/WhiteLabel';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Achievements": Achievements,
    "AssessmentAnalyticsDashboard": AssessmentAnalyticsDashboard,
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
    "ConversationalModule": ConversationalModule,
    "ConversationalModuleBuilder": ConversationalModuleBuilder,
    "ConversationalModulesLibrary": ConversationalModulesLibrary,
    "CustomAssessmentBuilder": CustomAssessmentBuilder,
    "Dashboard": Dashboard,
    "Development": Development,
    "EmailTemplates": EmailTemplates,
    "ExperienceAnalytics": ExperienceAnalytics,
    "ExperienceManagement": ExperienceManagement,
    "DevelopmentManager": DevelopmentManager,
    "FormBuilder": FormBuilder,
    "FormBuilderDashboard": FormBuilderDashboard,
    "FormSubmission": FormSubmission,
    "FormSubmissions": FormSubmissions,
    "Goal": Goal,
    "HRAssessmentDashboard": HRAssessmentDashboard,
    "Home": Home,
    "Insights": Insights,
    "JourneyBuilder": JourneyBuilder,
    "JourneyDetails": JourneyDetails,
    "LeadershipAssessment": LeadershipAssessment,
    "LearningAnalyticsDashboard": LearningAnalyticsDashboard,
    "LearningLibrary": LearningLibrary,
    "MyExperiences": MyExperiences,
    "MyJourneys": MyJourneys,
    "MyLearning": MyLearning,
    "MyOnboarding": MyOnboarding,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "OnboardingPlanBuilder": OnboardingPlanBuilder,
    "OrgPerformance": OrgPerformance,
    "Performance": Performance,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "ProvisioningBatchDetail": ProvisioningBatchDetail,
    "ProvisioningBatches": ProvisioningBatches,
    "PublicFormSubmission": PublicFormSubmission,
    "PublicRequestSubmission": PublicRequestSubmission,
    "QualificationsReview": QualificationsReview,
    "QuestionBankImport": QuestionBankImport,
    "QuestionEditor": QuestionEditor,
    "ReportBuilder": ReportBuilder,
    "RequestDashboard": RequestDashboard,
    "RoleSelector": RoleSelector,
    "Settings": Settings,
    "TeamCareerPaths": TeamCareerPaths,
    "TeamExperiences": TeamExperiences,
    "TeamLearning": TeamLearning,
    "TermsOfService": TermsOfService,
    "UATAdminDashboard": UATAdminDashboard,
    "UATTestingGuide": UATTestingGuide,
    "UserManagement": UserManagement,
    "WhiteLabel": WhiteLabel,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
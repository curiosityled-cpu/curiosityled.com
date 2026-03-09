import { useBranding } from './useBranding';

const DEFAULT_TERMINOLOGY = {
  'Assessment': 'Assessment',
  'Assessments': 'Assessments',
  'Goal': 'Goal',
  'Goals': 'Goals',
  'Learning Resource': 'Learning Resource',
  'Learning Resources': 'Learning Resources',
  'Cohort': 'Cohort',
  'Cohorts': 'Cohorts',
  'Onboarding Plan': 'Onboarding Plan',
  'Onboarding Plans': 'Onboarding Plans',
  'Team': 'Team',
  'Teams': 'Teams'
};

export const useTerminology = () => {
  const { branding } = useBranding();
  
  const t = (key) => {
    if (branding.terminology_overrides && branding.terminology_overrides[key]) {
      return branding.terminology_overrides[key];
    }
    return DEFAULT_TERMINOLOGY[key] || key;
  };

  return { t };
};
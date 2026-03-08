/**
 * A utility library for calculating career path readiness.
 */

/**
 * Calculates the readiness score for a user to transition to a target role.
 * 
 * @param {object} userAssessment - The user's most recent assessment record. Must contain competency scores like si_pct, dm_pct, etc.
 * @param {array} requiredCompetencies - Array of required competencies from the target Role entity.
 * @returns {object} An object containing the overall readiness score and a detailed gap analysis.
 */
export function calculateReadinessScore(userAssessment, requiredCompetencies) {
  if (!userAssessment || !requiredCompetencies || !Array.isArray(requiredCompetencies)) {
    return {
      readinessScore: 0,
      gapAnalysis: [],
      error: "Missing user assessment or target role competency data.",
    };
  }

  let totalWeightedGap = 0;
  let totalWeight = 0;
  const gapAnalysis = [];

  const assessmentMapping = {
    "Situational Intelligence": userAssessment.si_pct || 0,
    "Decision Making": userAssessment.dm_pct || 0,
    "Communication": userAssessment.comm_pct || 0,
    "Resource Management": userAssessment.rm_pct || 0,
    "Stakeholder Management": userAssessment.sm_pct || 0,
    "Performance Management": userAssessment.pm_pct || 0,
  };

  requiredCompetencies.forEach(req => {
    const currentScore = assessmentMapping[req.name] || 0;
    const targetScore = req.target_score || 75; // Default to 75 if not specified
    const weight = req.weight || 1;

    const gap = Math.max(0, targetScore - currentScore);
    totalWeightedGap += gap * weight;
    totalWeight += targetScore * weight;

    gapAnalysis.push({
      competency: req.name,
      currentScore: Math.round(currentScore),
      targetScore: targetScore,
      gap: Math.round(gap),
      weight: weight,
    });
  });

  const rawScore = totalWeight > 0 ? (1 - totalWeightedGap / totalWeight) * 100 : 100;
  const readinessScore = Math.max(0, Math.round(rawScore));

  return {
    readinessScore,
    gapAnalysis,
  };
}

/**
 * Estimates the time to become ready for a target role.
 * @param {number} readinessScore - The user's current readiness score (0-100).
 * @param {number} typicalDurationMonths - The typical duration in months from the CareerPath entity.
 * @returns {string} A human-readable estimate like "Approx. 6-9 months".
 */
export function estimateTimeToReady(readinessScore, typicalDurationMonths) {
    if (typeof typicalDurationMonths !== 'number') {
        return "N/A";
    }

    if (readinessScore >= 95) {
        return "Ready now";
    }

    const remainingEffortFactor = (100 - readinessScore) / 100;
    const estimatedMonths = typicalDurationMonths * remainingEffortFactor;

    if (estimatedMonths <= 1) return "Approx. 1 month";
    if (estimatedMonths <= 3) return "Approx. 1-3 months";
    if (estimatedMonths <= 6) return "Approx. 3-6 months";
    if (estimatedMonths <= 9) return "Approx. 6-9 months";
    if (estimatedMonths <= 12) return "Approx. 9-12 months";
    if (estimatedMonths <= 18) return "Approx. 12-18 months";
    
    return "More than 18 months";
}
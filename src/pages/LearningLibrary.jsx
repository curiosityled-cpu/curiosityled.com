import React from "react";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import LearnerCatalog from "@/components/learning/LearnerCatalog";

/**
 * LearningLibrary — the learner's course library.
 *
 * Holds courses and journeys only. Learning resources are the material a course
 * embeds, so they are managed by HR admins in Development Manager → Resources
 * and reached by learners inside a course, never browsed here.
 */
function LearningLibrary() {
  return <LearnerCatalog />;
}

export default withAuthProtection(LearningLibrary);
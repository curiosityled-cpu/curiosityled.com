import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689807051dd69c2529ceabd9/2e32ade86_CuriosityLedLogoBBW.png";

export default function PrivacyPolicy() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl("LandingPage")}>
            <img src={LOGO_URL} alt="Curiosity Led" className="h-8" />
          </Link>
          {isAuthenticated && (
            <Link to={createPageUrl("LandingPage")}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: December 5, 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Curiosity Led ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our leadership development platform and related services.
            </p>
            <p className="text-gray-600">
              By accessing or using Curiosity Led, you agree to this Privacy Policy. If you do not agree with the terms of this policy, please do not access the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">Personal Information</h3>
            <p className="text-gray-600 mb-4">We may collect the following personal information:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Name and email address</li>
              <li>Job title and organizational role</li>
              <li>Profile information and preferences</li>
              <li>Assessment responses and results</li>
              <li>Learning progress and completion data</li>
              <li>Goals, performance metrics, and feedback</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Usage Information</h3>
            <p className="text-gray-600 mb-4">We automatically collect certain information when you use our platform:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Usage patterns and feature interactions</li>
              <li>Session duration and frequency</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide and maintain our leadership development services</li>
              <li>Personalize your learning experience and recommendations</li>
              <li>Generate insights and analytics for you and your organization</li>
              <li>Improve our platform and develop new features</li>
              <li>Communicate with you about updates, support, and services</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Monitor for potential Protected Health Information (PHI) exposure and alert administrators</li>
              <li>Maintain audit logs for security and compliance purposes</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Your Organization:</strong> Aggregated and individual data as permitted by your employer's agreement with us</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (e.g., hosting, analytics)</li>
              <li><strong>Integration Partners:</strong> Microsoft Teams, Slack, and other platforms you authorize</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-600 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Role-based data access policies</li>
              <li>Automated PHI detection systems for healthcare organizations</li>
              <li>Comprehensive audit logging and monitoring</li>
              <li>Session timeout and multi-factor authentication options</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-600">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law or your organization's agreement with us. Upon termination of services, we will delete or anonymize your data within 90 days, unless otherwise required.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Controls</h2>
            <p className="text-gray-600 mb-4">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access and receive a copy of your personal data via our Privacy Settings page</li>
              <li>Download your data in machine-readable format (JSON)</li>
              <li>View access logs showing who has accessed your data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
              <li>Complete mandatory privacy training to understand your rights</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You can exercise most of these rights directly through your Privacy Settings page in the platform. 
              For additional assistance, contact us at <a href="mailto:privacy@curiosityled.com" className="text-[#0202ff] hover:underline">privacy@curiosityled.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Healthcare Organizations and HIPAA Compliance</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">Platform Purpose</h3>
            <p className="text-gray-600 mb-4">
              Curiosity Led is a leadership development platform designed for professional growth and organizational development. It is <strong>not intended for the storage, processing, or transmission of Protected Health Information (PHI)</strong> as defined under the Health Insurance Portability and Accountability Act (HIPAA).
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">PHI Prohibition</h3>
            <p className="text-gray-600 mb-4">
              Healthcare organizations must ensure that the following types of patient PHI are <strong>never entered into the platform</strong>:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Social Security Numbers</li>
              <li>Medical Record Numbers</li>
              <li>Health Plan Beneficiary Numbers</li>
              <li>Account Numbers (healthcare-related)</li>
              <li>Certificate/License Numbers (medical-related)</li>
              <li>Vehicle Identifiers</li>
              <li>Device Identifiers and Serial Numbers (medical devices)</li>
              <li>Biometric Identifiers (fingerprints, retinal scans, voice prints)</li>
              <li>Facial photographs (used for patient identification)</li>
              <li>Any information linking to a patient's medical condition, diagnosis, or treatment</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Employee Data vs. Patient Data</h3>
            <p className="text-gray-600 mb-4">
              The platform collects and processes information about <strong>employees of healthcare organizations</strong> for leadership development purposes (e.g., names, email addresses, job titles, assessment results, learning progress). This employee data is distinct from patient PHI and is subject to standard employment and professional development practices.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Business Associate Agreement (BAA)</h3>
            <p className="text-gray-600 mb-4">
              For healthcare organizations that may process any employee health-related data that could be considered PHI, we offer a Business Associate Agreement (BAA) as required by HIPAA. Healthcare clients must contact us to execute a BAA before using the platform.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Client Responsibilities</h3>
            <p className="text-gray-600 mb-4">
              Healthcare organizations using Curiosity Led are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Ensuring their employees do not enter patient PHI into the platform</li>
              <li>Implementing internal policies and training to prevent PHI exposure</li>
              <li>Executing a BAA with us if required</li>
              <li>Conducting their own HIPAA compliance assessments</li>
              <li>Monitoring and auditing use of the platform to prevent unauthorized PHI disclosure</li>
              <li>Configuring and monitoring our automated PHI detection systems</li>
              <li>Reviewing compliance dashboards and audit logs regularly</li>
              <li>Ensuring all users complete mandatory privacy training</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">Our PHI Prevention Measures</h3>
            <p className="text-gray-600 mb-4">
              To assist healthcare organizations in preventing PHI exposure, we provide:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Automated PHI pattern detection that scans for common identifiers (SSN, MRN, etc.)</li>
              <li>Real-time blocking of submissions containing detected PHI patterns</li>
              <li>Administrator alerts when PHI detection is triggered</li>
              <li>Comprehensive audit logging of all data access and modifications</li>
              <li>Privacy compliance dashboards for organizational oversight</li>
              <li>Mandatory privacy training modules for all users</li>
              <li>Role-based data access controls</li>
            </ul>
            </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Integrations</h2>
            <p className="text-gray-600">
              Our platform integrates with third-party services such as Microsoft Teams and Slack. When you connect these services, their respective privacy policies also apply. We encourage you to review the privacy policies of any third-party services you connect to Curiosity Led.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600">
              Curiosity Led is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 font-medium">Curiosity Led</p>
              <p className="text-gray-600">Email: <a href="mailto:privacy@curiosityled.com" className="text-[#0202ff] hover:underline">privacy@curiosityled.com</a></p>
              <p className="text-gray-600">Website: <a href="https://www.curiosityled.com" className="text-[#0202ff] hover:underline">www.curiosityled.com</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Curiosity Led. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
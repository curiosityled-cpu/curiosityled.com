import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689807051dd69c2529ceabd9/2e32ade86_CuriosityLedLogoBBW.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl("LandingPage")}>
            <img src={LOGO_URL} alt="Curiosity Led" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: July 12, 2026</p>

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
              <li>Daily check-in responses, including energy, confidence, focus, load, and growth scores</li>
              <li>Big 3 priorities and midday priority loop updates</li>
              <li>Decision journal entries and leadership reflection notes</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">AI Coach (Atreus) Data</h3>
            <p className="text-gray-600 mb-4">
              When you interact with Atreus, our AI coaching assistant, we process:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Conversation messages and context (including the page you were viewing when you engaged Atreus)</li>
              <li>Tone preferences (e.g., professional, warm, direct) and proactivity level settings</li>
              <li>Behavioral pattern observations derived from your check-in history and activity</li>
              <li>Commitments and intentions you express during coaching conversations</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Atreus conversations and the behavioral patterns it identifies are <strong>private to you</strong>. They are not shared with your manager, HR, or anyone else in your organization. You can disable Atreus entirely or turn off behavioral pattern observation at any time in your Settings.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Calendar Integration Data</h3>
            <p className="text-gray-600 mb-4">
              If you voluntarily connect a Google Calendar or Microsoft Outlook calendar, we process limited calendar metadata to support meeting preparation, 1:1 scheduling, and daily rhythm features. This includes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Meeting titles, start/end times, and attendee lists (for your own meetings)</li>
              <li>Meeting density and back-to-back scheduling patterns</li>
              <li>1:1 meeting identification for prep and debrief workflows</li>
            </ul>
            <p className="text-gray-600">
              Calendar integration requires your explicit consent and can be revoked at any time. We do not store the full content of your calendar events—only the metadata needed to power the features described above.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Usage Information</h3>
            <p className="text-gray-600 mb-4">We automatically collect certain information when you use our platform:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Device and browser information</li>
              <li>IP address and approximate location data</li>
              <li>Usage patterns and feature interactions</li>
              <li>Session duration and frequency</li>
              <li>Login history and authentication events</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide and maintain our leadership development services</li>
              <li>Personalize your learning experience and recommendations</li>
              <li>Generate AI-powered coaching insights through Atreus</li>
              <li>Detect and surface recurring behavioral patterns to support your growth</li>
              <li>Power daily rhythm features (morning/evening check-ins, Big 3 priorities, midday loops)</li>
              <li>Support 1:1 meeting preparation and follow-up when calendar integration is enabled</li>
              <li>Generate aggregated analytics for you and your organization (with visibility controlled by your sharing preferences)</li>
              <li>Improve our platform and develop new features</li>
              <li>Communicate with you about updates, support, and services via your chosen notification channels</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Monitor for potential Protected Health Information (PHI) exposure and alert administrators</li>
              <li>Maintain comprehensive audit logs for security and compliance purposes</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">
              You have fine-grained control over what is shared with your organization through the <strong>Visibility & Share Flags</strong> in your Privacy & Data settings. By default, the following data is <strong>private to you</strong> and never shared with your manager or HR:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Daily check-in responses (energy, confidence, focus, load, growth scores)</li>
              <li>Big 3 priorities and midday loop updates</li>
              <li>Atreus conversation history and behavioral pattern observations</li>
              <li>Decision journal entries (unless you explicitly share them)</li>
            </ul>
            <p className="text-gray-600 mb-4">We may share information with:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li><strong>Your Organization:</strong> Only the data you have explicitly enabled via your visibility/share flags, plus aggregated and anonymized analytics as permitted by your employer's agreement with us</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (e.g., cloud hosting, email delivery, analytics)</li>
              <li><strong>Integration Partners:</strong> Google Calendar, Microsoft Outlook, Microsoft Teams, and Slack—only when you explicitly authorize the connection</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-600 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures designed to protect your information. While we are not yet SOC 2 certified, our platform is engineered with SOC 2-aligned controls, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Encryption of data in transit (TLS) and at rest</li>
              <li>Role-based access control (RBAC) with row-level security policies on all sensitive data</li>
              <li>Multi-factor authentication and session management with configurable timeout</li>
              <li>Comprehensive audit logging of all data access, modifications, and administrative actions</li>
              <li>Automated PHI detection systems that scan for and block common healthcare identifiers</li>
              <li>Privacy compliance dashboards for organizational oversight</li>
              <li>Separation of duties between platform administration and client data access</li>
              <li>Regular security assessments and vulnerability monitoring</li>
              <li>Employee training on data protection and privacy practices</li>
              <li>Data retention controls with configurable retention periods</li>
            </ul>
            <p className="text-gray-600">
              We are actively working toward formal SOC 2 Type II certification and will update this policy when certification is achieved.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law or your organization's agreement with us.
            </p>
            <p className="text-gray-600 mb-4">
              The default data retention period for activity data is <strong>90 days</strong>. Organization administrators can configure custom retention periods through the Data Retention settings. Upon termination of services, we will delete or anonymize your data within the configured retention window, unless otherwise required by law.
            </p>
            <p className="text-gray-600">
              You can request a full download of your data at any time through the "My Data" section of your Privacy & Data settings, and you can delete your account and associated data through the Account section.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Controls</h2>
            <p className="text-gray-600 mb-4">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Access and receive a copy of your personal data via the "My Data" section in Settings</li>
              <li>Download your data in machine-readable format (JSON)</li>
              <li>View access logs showing who has accessed your data</li>
              <li>Correct inaccurate or incomplete data through your Profile page</li>
              <li>Request deletion of your data or delete your account directly via Settings</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent for calendar integrations at any time</li>
              <li>Complete mandatory privacy training to understand your rights</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Controls Available in Your Settings</h3>
            <p className="text-gray-600 mb-4">You can manage your privacy directly through the Settings page, which includes four tabs:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li><strong>Notifications:</strong> Choose your notification channels (in-app, email, Microsoft Teams, Slack), select which notification types you receive (goal reminders, learning assignments, assessment due dates, AI coach nudges, 1:1 meeting requests, daily rhythm reminders), and set frequency (instant, daily digest, or weekly summary)</li>
              <li><strong>Atreus:</strong> Configure your AI coach's tone and proactivity level, and grant or revoke calendar integration consent (Google Calendar or Microsoft Outlook)</li>
              <li><strong>Privacy & Data:</strong> Control behavioral pattern observation (Pattern Watch), manage fine-grained visibility and share flags, download your data, complete privacy training, and delete your account</li>
              <li><strong>Platform (admins only):</strong> Access branding, user management, command center, and automation configuration</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You can exercise most of these rights directly through your Settings page.
              For additional assistance, contact us at <a href="mailto:team@curiosityled.com" className="text-[#0202ff] hover:underline">team@curiosityled.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. AI Coach (Atreus) Privacy</h2>
            <p className="text-gray-600 mb-4">
              Atreus is our AI-powered coaching assistant that helps you reflect, plan, and grow as a leader. We designed Atreus with privacy at its core:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li><strong>Private conversations:</strong> Your conversations with Atreus are private to you. They are never shared with your manager, HR, or colleagues</li>
              <li><strong>Behavioral pattern observation:</strong> Atreus can identify recurring patterns from your check-in history to surface helpful insights. You can turn this off at any time via the "Allow Atreus to observe behavioral patterns" toggle in Privacy & Data settings</li>
              <li><strong>Enable/disable:</strong> You can completely disable the Atreus agent at any time</li>
              <li><strong>Tone and proactivity:</strong> You control how Atreus communicates with you—its tone (professional, warm, direct) and its proactivity level (suggestive, proactive)</li>
              <li><strong>Memory:</strong> Atreus maintains a private memory of your recurring triggers, what has helped you, and where you tend to get stuck—this memory is visible only to you and is used solely to provide more contextual coaching</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Healthcare Organizations and HIPAA Compliance</h2>
            
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
              <li>Configuring and monitoring our automated PHI detection systems via the PHI Detection settings</li>
              <li>Reviewing the Compliance Dashboard and audit logs regularly</li>
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
              <li>Privacy compliance dashboards for organizational oversight (admin-accessible)</li>
              <li>Configurable data retention settings</li>
              <li>Mandatory privacy training modules for all users</li>
              <li>Role-based data access controls with row-level security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Third-Party Integrations</h2>
            <p className="text-gray-600 mb-4">
              Our platform integrates with the following third-party services. When you connect these services, their respective privacy policies also apply:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li><strong>Google Calendar:</strong> Used for meeting metadata, 1:1 scheduling, and daily rhythm features. Requires your explicit OAuth consent; can be revoked at any time</li>
              <li><strong>Microsoft Outlook Calendar:</strong> Used for the same purposes as Google Calendar, via Microsoft Graph API with your consent</li>
              <li><strong>Microsoft Teams:</strong> Used for sending notifications to channels you configure via webhook</li>
              <li><strong>Slack:</strong> Used for sending notifications to channels you configure via webhook</li>
            </ul>
            <p className="text-gray-600">
              We encourage you to review the privacy policies of any third-party services you connect to Curiosity Led. Calendar integrations are opt-in only and process limited metadata—not the full content of your events.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Children's Privacy</h2>
            <p className="text-gray-600">
              Curiosity Led is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 font-medium">Curiosity Led</p>
              <p className="text-gray-600">Email: <a href="mailto:team@curiosityled.com" className="text-[#0202ff] hover:underline">team@curiosityled.com</a></p>
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
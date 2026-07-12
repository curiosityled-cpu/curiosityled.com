import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689807051dd69c2529ceabd9/2e32ade86_CuriosityLedLogoBBW.png";

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: December 5, 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              Welcome to Curiosity Led. These Terms of Service ("Terms") govern your access to and use of the Curiosity Led leadership development platform, including any associated applications, features, and services (collectively, the "Service").
            </p>
            <p className="text-gray-600">
              By accessing or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Curiosity Led provides a comprehensive leadership development platform that includes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Leadership assessments and diagnostics</li>
              <li>Personalized learning paths and content</li>
              <li>Goal setting and performance tracking</li>
              <li>AI-powered coaching and insights</li>
              <li>Team and organizational analytics</li>
              <li>Integration with workplace tools (Microsoft Teams, Slack)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">Account Creation</h3>
            <p className="text-gray-600 mb-4">
              To access the Service, you must create an account or be provisioned one by your organization. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Account Security</h3>
            <p className="text-gray-600 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Account Termination</h3>
            <p className="text-gray-600">
              We reserve the right to suspend or terminate your account if you violate these Terms or if your organization's subscription ends.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or servers connected to it</li>
              <li>Transmit viruses, malware, or other harmful code</li>
              <li>Impersonate any person or entity</li>
              <li>Harvest or collect information about other users without consent</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Share your account credentials with others</li>
              <li><strong>Enter, store, or transmit Protected Health Information (PHI) of patients</strong> (healthcare organizations only)</li>
              <li>Use the Service in any manner that violates HIPAA or other healthcare data protection regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Healthcare Organizations - Specific Terms</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">Prohibited Use of Patient PHI</h3>
            <p className="text-gray-600 mb-4">
              If you are a healthcare organization or employee thereof, you expressly agree that Curiosity Led is <strong>not intended for, and must not be used to store, process, or transmit any Protected Health Information (PHI)</strong> related to patients, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Patient names, addresses, dates of birth</li>
              <li>Social Security Numbers, Medical Record Numbers, or Health Plan Beneficiary Numbers</li>
              <li>Any medical diagnoses, conditions, treatments, or prescriptions</li>
              <li>Biometric identifiers, facial images, or device identifiers linked to patient care</li>
              <li>Any of the 18 HIPAA identifiers when associated with patient health information</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Employee Data Distinction</h3>
            <p className="text-gray-600 mb-4">
              The Service is designed exclusively for leadership and professional development of <strong>employees within healthcare organizations</strong>. Data collected relates to employee performance, assessments, learning progress, and professional goals—not patient care or medical records.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Business Associate Agreement (BAA)</h3>
            <p className="text-gray-600 mb-4">
              Healthcare organizations that determine a Business Associate Agreement (BAA) is required for their use of the Service must contact us at <a href="mailto:team@curiosityled.com" className="text-[#0202ff] hover:underline">team@curiosityled.com</a> to execute such an agreement before using the Service.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Client Compliance Obligations</h3>
            <p className="text-gray-600 mb-4">
              Healthcare organizations are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Training employees on proper use of the Service and prohibition of PHI entry</li>
              <li>Implementing policies and technical controls to prevent PHI disclosure</li>
              <li>Conducting independent HIPAA compliance assessments</li>
              <li>Monitoring and auditing employee use to ensure no patient data is entered</li>
              <li>Reporting any suspected PHI disclosure to us immediately</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">Our Intellectual Property</h3>
            <p className="text-gray-600 mb-4">
              The Service, including all content, features, functionality, and underlying technology, is owned by Curiosity Led and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Your Content</h3>
            <p className="text-gray-600">
              You retain ownership of any content you submit to the Service (e.g., assessment responses, goals, feedback). By submitting content, you grant us a license to use, store, and process it to provide and improve the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Subscription and Payment</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">Pricing</h3>
            <p className="text-gray-600 mb-4">
              Access to the Service requires a paid subscription. Pricing is based on your organization's size and selected features. All prices are in USD unless otherwise stated.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Payment Terms</h3>
            <p className="text-gray-600 mb-4">
              Subscriptions may be billed monthly or annually as agreed upon. Payment is due according to the billing cycle selected. We accept major credit cards and other payment methods as specified.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mb-3">Refunds</h3>
            <p className="text-gray-600">
              Refunds are handled on a case-by-case basis. Please contact us at billing@curiosityled.com for refund requests.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data and Privacy</h2>
            <p className="text-gray-600 mb-4">
              Your use of the Service is also governed by our <Link to={createPageUrl("PrivacyPolicy")} className="text-[#0202ff] hover:underline">Privacy Policy</Link>, which describes how we collect, use, and protect your data.
            </p>
            <p className="text-gray-600">
              For enterprise customers, we offer Data Processing Agreements (DPAs) upon request to comply with GDPR and other data protection regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Integrations</h2>
            <p className="text-gray-600">
              The Service may integrate with third-party applications such as Microsoft Teams, Slack, and HR systems. Your use of these integrations is subject to the terms and privacy policies of those third parties. We are not responsible for the practices of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Disclaimers</h2>
            <p className="text-gray-600 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
            <p className="text-gray-600">
              The assessments, insights, and recommendations provided by the Service are for informational and developmental purposes only and should not be considered professional advice. Users should exercise their own judgment in applying any insights gained from the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Limitation of Liability</h2>
            <p className="text-gray-600">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CURIOSITY LED SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU OR YOUR ORGANIZATION IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Indemnification</h2>
            <p className="text-gray-600">
              You agree to indemnify and hold harmless Curiosity Led, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
            <p className="text-gray-600">
              We may modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
            <p className="text-gray-600">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Delaware.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Severability</h2>
            <p className="text-gray-600">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about these Terms, please contact us:
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
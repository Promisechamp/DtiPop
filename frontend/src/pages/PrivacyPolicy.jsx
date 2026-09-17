import React from 'react';
import { Link } from 'react-router-dom';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-6 lg:px-8">
        <PageNavigation />

        <div className="mt-10">
          {/* Header (Unified) */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Privacy & Security
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Privacy Policy
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Last updated: {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mt-6 bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6 md:p-8 space-y-6 text-ink-700 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">1. Information We Collect</h2>
              <p className="mb-2">When you use Don't Trash It, we may collect the following information:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-bold">Account Information:</strong> Name, email address, location, and profile picture.</li>
                <li><strong className="font-bold">Item Information:</strong> Descriptions, images, and categories of items you list.</li>
                <li><strong className="font-bold">Application Data:</strong> Messages you send when applying for items.</li>
                <li><strong className="font-bold">Usage Data:</strong> Pages visited, actions taken, and interactions with other users.</li>
                <li><strong className="font-bold">Communication Data:</strong> Messages sent through the Platform's chat feature.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>To provide and maintain the Platform.</li>
                <li>To connect donors with potential recipients.</li>
                <li>To send notifications about applications, messages, and winners.</li>
                <li>To improve the Platform and user experience.</li>
                <li>To prevent fraud and abuse.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">3. Information Sharing</h2>
              <p className="mb-2">We do not sell your personal information. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-bold">Other Users:</strong> Your name, location, and profile picture are visible to users you interact with.</li>
                <li><strong className="font-bold">Service Providers:</strong> Third-party services that help us operate the Platform (e.g., cloud storage, email services).</li>
                <li><strong className="font-bold">Legal Requirements:</strong> When required by law or to protect our rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">4. Data Security</h2>
              <p>
                We implement reasonable security measures to protect your personal information.
                However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">5. Cookies</h2>
              <p>
                We use cookies and similar technologies to remember your preferences, keep you signed in,
                and analyse Platform usage. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">6. Your Rights</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Access and update your personal information through your profile settings.</li>
                <li>Request deletion of your account and associated data.</li>
                <li>Opt-out of non-essential communications.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">7. Data Retention</h2>
              <p>
                We retain your information as long as your account is active or as needed to provide the Platform.
                Deleted accounts may have their data retained for a limited period for legal and operational purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">8. Children's Privacy</h2>
              <p>
                The Platform is not intended for users under the age of 13. We do not knowingly collect
                information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Users will be notified of significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">10. Contact</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us through the{' '}
                <Link to="/contact" className="text-primary-600 hover:text-primary-700 font-bold transition">
                  Contact Page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
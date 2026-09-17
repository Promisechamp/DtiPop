import React from 'react';
import { Link } from 'react-router-dom';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-6 lg:px-8">
        <PageNavigation />

        <div className="mt-10">qqqqqqqq
          {/* Header (Unified) */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Legal
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Terms of Service
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Last updated: {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mt-6 bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6 md:p-8 space-y-6 text-ink-700 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Don't Trash It ("the Platform"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">2. Description of Service</h2>
              <p>
                Don't Trash It is a community-driven platform that connects people who want to give away items they no longer need
                with people who can use them. Users can list items for free, apply to receive items, and communicate through the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">3. User Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You must provide accurate information when creating an account and listing items.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree not to list prohibited items (illegal, dangerous, or counterfeit goods).</li>
                <li>You will treat other users with respect and communicate honestly.</li>
                <li>Donors are responsible for accurately describing items and their condition.</li>
                <li>Recipients (winners) are responsible for any shipping costs unless the donor offers free shipping.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">4. Item Listings</h2>
              <p>
                All items listed must be free of charge. The Platform is designed for giving, not selling.
                Donors may specify whether they will cover shipping costs or if the recipient must pay.
                Donors have the right to choose any applicant as the recipient of their item.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">5. Applications and Winners</h2>
              <p>
                Users may apply for items they need. Donors review applications and select a winner at their discretion.
                Once selected, the winner is responsible for coordinating pickup or shipping with the donor.
                The Platform is not responsible for the condition of items or the behaviour of users.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">6. Prohibited Conduct</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Harassing, threatening, or abusing other users.</li>
                <li>Posting false, misleading, or fraudulent information.</li>
                <li>Attempting to sell items or solicit payments through the Platform.</li>
                <li>Using the Platform for any illegal purpose.</li>
                <li>Creating multiple accounts to abuse the application system.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">7. Limitation of Liability</h2>
              <p>
                Don't Trash It is provided "as is" without warranties of any kind. We are not liable for any damages
                arising from the use of the Platform, including but not limited to disputes between users,
                item quality issues, or shipping problems.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">8. Termination</h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms of Service
                or engage in harmful behaviour on the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">9. Changes to Terms</h2>
              <p>
                We may update these Terms of Service from time to time. Users will be notified of significant changes.
                Continued use of the Platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-3">10. Contact</h2>
              <p>
                If you have questions about these Terms, please contact us through the{' '}
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

export default TermsOfServicePage;
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';

const faqData = [
  {
    category: 'General',
    icon: 'bi-info-circle',
    questions: [
      {
        q: 'What is Don\'t Trash It?',
        a: 'Don\'t Trash It is a community‑driven platform that connects people who want to give away items they no longer need with people who can use them. Everything is completely free.',
      },
      {
        q: 'Is it really free?',
        a: 'Yes! Listing items and applying for items is 100% free. We believe in reducing waste by helping items find new homes.',
      },
      {
        q: 'How does it work?',
        a: 'Donors list items they want to give away. People who need those items apply with a short message. The donor chooses a winner, and they coordinate pickup or shipping.',
      },
    ],
  },
  {
    category: 'Listing Items',
    icon: 'bi-box-seam',
    questions: [
      {
        q: 'How do I list an item?',
        a: 'Sign in, click "List Item", fill in the details, upload photos, and choose your shipping preference. Your item will be live for others to apply.',
      },
      {
        q: 'What items can I list?',
        a: 'Almost anything in good condition! Furniture, electronics, clothing, books, baby items, etc. Just make sure it\'s safe and legal to give away.',
      },
      {
        q: 'How many images can I upload?',
        a: 'Up to 5 images per item. Clear photos help your item find a new home faster!',
      },
      {
        q: 'Can I edit or delete my listing?',
        a: 'Yes! You can edit your item details, change the status, or delete it entirely from your "My Items" page.',
      },
    ],
  },
  {
    category: 'Applying for Items',
    icon: 'bi-send',
    questions: [
      {
        q: 'How do I apply for an item?',
        a: 'Browse items on the platform, click on one you like, and hit "Apply for This Item". Write a brief message explaining why you need it.',
      },
      {
        q: 'How are winners chosen?',
        a: 'The donor reviews all applications and selects a winner at their discretion. You\'ll be notified either way.',
      },
      {
        q: 'Can I apply for multiple items?',
        a: 'Absolutely! You can apply for as many items as you like.',
      },
      {
        q: 'What if my application is rejected?',
        a: 'Don\'t worry! You can apply for other items. Some donors may re‑consider previously rejected applications if their first choice falls through.',
      },
    ],
  },
  {
    category: 'Shipping & Pickup',
    icon: 'bi-truck',
    questions: [
      {
        q: 'Who pays for shipping?',
        a: 'It depends on the donor. Some donors offer free shipping, while others ask the winner to cover costs. This is clearly displayed on every item.',
      },
      {
        q: 'How do I coordinate pickup?',
        a: 'Once you\'re selected as a winner, you can chat with the donor directly through our platform to arrange pickup or delivery.',
      },
      {
        q: 'What if I can\'t pick up the item?',
        a: 'If shipping isn\'t offered and you can\'t pick it up, you may need to decline. Communication with the donor is key!',
      },
    ],
  },
  {
    category: 'Account & Profile',
    icon: 'bi-person',
    questions: [
      {
        q: 'Do I need to verify my email?',
        a: 'Verification is required to list items and apply. You\'ll receive a verification email when you sign up. Check your spam folder if you don\'t see it.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to your Profile page, click "Change Password", enter your current and new password.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, contact our support team and we\'ll help you delete your account and associated data.',
      },
      {
        q: 'How does the rating system work?',
        a: 'After a successful donation, both parties can rate each other. This helps build trust in the community.',
      },
    ],
  },
  {
    category: 'Support & Safety',
    icon: 'bi-shield-check',
    questions: [
      {
        q: 'What if an item is not as described?',
        a: 'Contact the donor first. If the issue isn\'t resolved, you can report the item through the platform.',
      },
      {
        q: 'How do I report a problem?',
        a: 'Use the "Report an Issue" button on any item or application, or create a support ticket from your dashboard.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'We take privacy seriously. Read our Privacy Policy for details. We never sell your data.',
      },
      {
        q: 'What if someone is being inappropriate?',
        a: 'Report them immediately using the flag/report buttons, or contact our support team. We have a zero‑tolerance policy for harassment.',
      },
    ],
  },
];

const FAQPage = () => {
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenQuestions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
        <PageNavigation />

        <div className="mt-10">
          {/* Header (Unified) */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
                  Get answers
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Frequently Asked Questions
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Find answers to common questions
              </p>
            </div>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-6 mt-6">
            {faqData.map((category, catIndex) => (
              <div key={catIndex} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-3 bg-ink-50/50">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                    <i className={`bi ${category.icon} text-primary-600`}></i>
                  </div>
                  <h2 className="text-lg font-extrabold text-ink-900">{category.category}</h2>
                </div>

                <div className="divide-y divide-ink-50">
                  {category.questions.map((item, qIndex) => {
                    const isOpen = openQuestions[`${catIndex}-${qIndex}`];
                    return (
                      <div key={qIndex}>
                        <button
                          onClick={() => toggleQuestion(catIndex, qIndex)}
                          className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-ink-50/50 transition"
                        >
                          <span className="text-sm font-bold text-ink-900 pr-4">{item.q}</span>
                          <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-ink-400 flex-shrink-0`}></i>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4 text-sm text-ink-600 leading-relaxed">
                                {item.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Still need help? */}
          <div className="mt-8 bg-primary-50 rounded-2xl border border-primary-200/60 p-6 text-center shadow-sm">
            <i className="bi bi-chat-heart text-3xl text-primary-600 mb-2 block"></i>
            <h3 className="text-lg font-extrabold text-ink-900">Still have questions?</h3>
            <p className="text-sm text-ink-600 mt-1 mb-4">
              Our support team is here to help. Reach out and we'll get back to you quickly.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href="/support"
                className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl text-sm font-extrabold transition"
              >
                Create Support Ticket
              </a>
              <a
                href="/contact"
                className="px-5 py-2.5 bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 rounded-xl text-sm font-bold transition"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
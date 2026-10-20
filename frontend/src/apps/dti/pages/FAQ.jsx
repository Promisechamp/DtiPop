import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info,
  Package,
  Send,
  Truck,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  HelpCircle,
} from 'lucide-react';



/* ============================================================
   FAQ DATA
============================================================ */

const faqData = [
  {
    category: 'General',
    icon: Info,
    questions: [
      {
        q: "What is Don't Trash It?",
        a: "Don't Trash It is a community-driven platform that connects people who want to give away items they no longer need with people who can use them. Everything is completely free.",
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
    icon: Package,
    questions: [
      {
        q: 'How do I list an item?',
        a: 'Sign in, click "List Item", fill in the details, upload photos, and choose your shipping preference. Your item will be live for others to apply.',
      },
      {
        q: 'What items can I list?',
        a: "Almost anything in good condition! Furniture, electronics, clothing, books, baby items, etc. Just make sure it's safe and legal to give away.",
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
    icon: Send,
    questions: [
      {
        q: 'How do I apply for an item?',
        a: 'Browse items on the platform, click on one you like, and hit "Apply for This Item". Write a brief message explaining why you need it.',
      },
      {
        q: 'How are winners chosen?',
        a: "The donor reviews all applications and selects a winner at their discretion. You'll be notified either way.",
      },
      {
        q: 'Can I apply for multiple items?',
        a: 'Absolutely! You can apply for as many items as you like.',
      },
      {
        q: 'What if my application is rejected?',
        a: "Don't worry! You can apply for other items. Some donors may re-consider previously rejected applications if their first choice falls through.",
      },
    ],
  },
  {
    category: 'Shipping & Pickup',
    icon: Truck,
    questions: [
      {
        q: 'Who pays for shipping?',
        a: 'It depends on the donor. Some donors offer free shipping, while others ask the winner to cover costs. This is clearly displayed on every item.',
      },
      {
        q: 'How do I coordinate pickup?',
        a: "Once you're selected as a winner, you can chat with the donor directly through our platform to arrange pickup or delivery.",
      },
      {
        q: "What if I can't pick up the item?",
        a: "If shipping isn't offered and you can't pick it up, you may need to decline. Communication with the donor is key!",
      },
    ],
  },
  {
    category: 'Account & Profile',
    icon: User,
    questions: [
      {
        q: 'Do I need to verify my email?',
        a: "Verification is required to list items and apply. You'll receive a verification email when you sign up. Check your spam folder if you don't see it.",
      },
      {
        q: 'How do I change my password?',
        a: 'Go to your Profile page, click "Change Password", enter your current and new password.',
      },
      {
        q: 'Can I delete my account?',
        a: "Yes, contact our support team and we'll help you delete your account and associated data.",
      },
      {
        q: 'How does the rating system work?',
        a: 'After a successful donation, both parties can rate each other. This helps build trust in the community.',
      },
    ],
  },
  {
    category: 'Support & Safety',
    icon: ShieldCheck,
    questions: [
      {
        q: 'What if an item is not as described?',
        a: "Contact the donor first. If the issue isn't resolved, you can report the item through the platform.",
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
        a: 'Report them immediately using the flag/report buttons, or contact our support team. We have a zero-tolerance policy for harassment.',
      },
    ],
  },
];

/* ============================================================
   PAGE
============================================================ */

const FAQPage = () => {
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenQuestions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <HelpCircle size={14} />
                <span>Get answers</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Frequently Asked Questions
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Find answers to common questions about giving, receiving, and
                everything in between.
              </p>
            </div>
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="space-y-5">
          {faqData.map((category, catIndex) => {
            const CategoryIcon = category.icon;

            return (
              <div
                key={catIndex}
                className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm"
              >
                {/* CATEGORY HEADER */}
                <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <CategoryIcon size={16} />
                  </div>

                  <h2 className="text-base font-black tracking-tight text-ink-950">
                    {category.category}
                  </h2>
                </div>

                {/* QUESTIONS */}
                <div className="divide-y divide-ink-100">
                  {category.questions.map((item, qIndex) => {
                    const isOpen =
                      openQuestions[`${catIndex}-${qIndex}`];

                    return (
                      <div key={qIndex}>
                        <button
                          type="button"
                          onClick={() =>
                            toggleQuestion(catIndex, qIndex)
                          }
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-ink-50/50"
                        >
                          <span className="text-sm font-extrabold text-ink-950">
                            {item.q}
                          </span>

                          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-ink-400">
                            {isOpen ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4 text-sm font-medium leading-6 text-ink-500">
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
            );
          })}
        </div>

        {/* STILL NEED HELP? */}
        <div className="mt-7 flex flex-col items-center gap-4 rounded-[26px] border border-primary-100 bg-primary-50 px-6 py-8 text-center sm:py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-100 text-primary-600">
            <HeartHandshake size={24} />
          </div>

          <div className="max-w-md">
            <h3 className="text-lg font-black tracking-tight text-ink-950">
              Still have questions?
            </h3>

            <p className="mt-2 text-sm font-medium leading-6 text-primary-700">
              Our support team is here to help. Reach out and we'll get back
              to you quickly.
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/support"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700"
            >
              <HeartHandshake size={15} />
              Create Support Ticket
            </Link>

            <Link
              to="/contact"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
import React, { useState } from 'react';
import { toast } from 'sonner';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);

    // Simulate sending – replace with actual API call if available
    setTimeout(() => {
      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 1000);
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
                  Get in touch
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
                Contact Us
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                We'd love to hear from you
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6 md:p-8">
                <h2 className="text-lg font-extrabold text-ink-900 mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-ink-700 mb-1">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-ink-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-ink-700 mb-1">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white"
                      placeholder="How can we help?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-ink-700 mb-1">Message *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="5"
                      className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white"
                      placeholder="Tell us more..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sending ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                    ) : (
                      <>
                        <i className="bi bi-send"></i>
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Contact Info Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-5">
                <h3 className="text-sm font-extrabold text-ink-900 mb-3 flex items-center gap-2">
                  <i className="bi bi-info-circle text-primary-600"></i>
                  Other ways to reach us
                </h3>
                <div className="space-y-3 text-sm text-ink-600">
                  <div className="flex items-start gap-3">
                    <i className="bi bi-envelope text-primary-600 mt-0.5"></i>
                    <div>
                      <p className="font-bold text-ink-900">Email</p>
                      <a href="mailto:support@donttrashit.com" className="text-primary-600 hover:text-primary-700 font-bold transition">
                        support@donttrashit.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <i className="bi bi-clock text-primary-600 mt-0.5"></i>
                    <div>
                      <p className="font-bold text-ink-900">Response Time</p>
                      <p className="font-medium">We typically reply within 24 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <i className="bi bi-question-circle text-primary-600 mt-0.5"></i>
                    <div>
                      <p className="font-bold text-ink-900">Support</p>
                      <a href="/support" className="text-primary-600 hover:text-primary-700 font-bold transition">
                        Visit our Support Center
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 rounded-2xl border border-primary-200/60 p-5 shadow-sm">
                <p className="text-sm font-bold text-primary-800">
                  <i className="bi bi-lightbulb mr-1"></i>
                  <span className="font-extrabold">Tip:</span> For faster help, check our{' '}
                  <a href="/faq" className="underline font-extrabold">
                    FAQ page
                  </a>{' '}
                  or{' '}
                  <a href="/support" className="underline font-extrabold">
                    Support Center
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
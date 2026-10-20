import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Send,
  Info,
  Mail,
  Clock,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';


/* =========================================================
   PAGE
========================================================= */

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
      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 1000);
  };

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <MessageCircle size={14} />
                <span>Get in touch</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Contact Us
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                We'd love to hear from you. Send us a message and we'll
                respond as soon as we can.
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* FORM */}
          <div className="lg:col-span-3">
            <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 text-base font-black tracking-tight text-ink-950">
                <Send size={16} className="text-primary-600" />
                Send us a message
              </h2>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                    Name <span className="text-danger-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                    className="input-field text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                    Email <span className="text-danger-500">*</span>
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="input-field text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    className="input-field text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                    Message <span className="text-danger-500">*</span>
                  </label>

                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Tell us more..."
                    required
                    className="input-field text-sm font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4 lg:col-span-2">
            {/* CONTACT INFO */}
            <div className="rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-black text-ink-950">
                <Info size={15} className="text-primary-600" />
                Other ways to reach us
              </h3>

              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <Mail size={15} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink-900">
                      Email
                    </p>

                    <a
                      href="mailto:support@donttrashit.com"
                      className="text-xs font-bold text-primary-600 transition hover:text-primary-700"
                    >
                      support@donttrashit.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <Clock size={15} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink-900">
                      Response Time
                    </p>

                    <p className="text-xs font-medium text-ink-500">
                      We typically reply within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <HelpCircle size={15} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink-900">
                      Support
                    </p>

                    <Link
                      to="/support"
                      className="text-xs font-bold text-primary-600 transition hover:text-primary-700"
                    >
                      Visit our Support Center
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* TIP CARD */}
            <div className="flex items-start gap-3 rounded-[26px] border border-primary-100 bg-primary-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                <Lightbulb size={16} />
              </div>

              <p className="text-xs font-medium leading-5 text-primary-700">
                <span className="font-extrabold">Tip:</span> For faster help,
                check our{' '}
                <Link
                  to="/faq"
                  className="font-extrabold underline transition hover:no-underline"
                >
                  FAQ page
                </Link>{' '}
                or{' '}
                <Link
                  to="/support"
                  className="font-extrabold underline transition hover:no-underline"
                >
                  Support Center
                </Link>
                .
              </p>
            </div>

            {/* EXTRA INFO CARD (bonus) */}
            <div className="flex items-start gap-3 rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success-50 text-success-600">
                <CheckCircle2 size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-ink-900">
                  We read every message
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-ink-500">
                  Whether it's feedback, a bug report, or just a hello — it
                  reaches a real person on the team.
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
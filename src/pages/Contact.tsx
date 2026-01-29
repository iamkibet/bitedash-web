import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    items: ['support@bitedash.com', 'info@bitedash.com'],
  },
  {
    icon: Phone,
    title: 'Phone',
    items: ['+254 700 000 000', '+254 711 000 000'],
  },
  {
    icon: MapPin,
    title: 'Address',
    items: ['Nairobi, Kenya'],
  },
] as const;

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement contact form submission
    toast.success("Thanks for your message. We'll get back to you soon.");
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10 pb-8 sm:pb-12">
      {/* Hero */}
      <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden" aria-labelledby="contact-heading">
        <div className="px-6 sm:px-8 py-10 sm:py-14 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-6 shadow-sm" aria-hidden>
            <MessageSquare className="h-8 w-8" />
          </div>
          <h1 id="contact-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Contact us
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Have a question, feedback, or want to partner with us? We’d love to hear from you.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Contact info */}
        <aside className="space-y-4 sm:space-y-5" aria-label="Contact information">
          {contactInfo.map(({ icon: Icon, title, items }) => (
            <Card
              key={title}
              className="p-5 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200/80 transition-all duration-200"
              padding="none"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 ring-1 ring-primary-100/50"
                  aria-hidden
                >
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="font-semibold text-gray-900 text-base sm:text-lg">
                    {title}
                  </h2>
                  <ul className="mt-2 space-y-1 list-none p-0 m-0">
                    {items.map((item) => (
                      <li key={item} className="text-sm text-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </aside>

        {/* Form */}
        <div className="lg:col-span-2">
          <Card
            className="p-6 sm:p-8 bg-white border border-gray-200/80 rounded-2xl shadow-sm"
            padding="none"
          >
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Send a message
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Fill out the form below and we’ll get back to you as soon as we can.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <Input
                  label="Your name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Jane Doe"
                  className="border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Input
                  label="Email address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="e.g. jane@example.com"
                  className="border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <Input
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="e.g. Order enquiry"
                className="border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors placeholder:text-gray-400 resize-y min-h-[120px]"
                  placeholder="Tell us what you need..."
                />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto rounded-xl px-5 py-2.5 font-medium inline-flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4 shrink-0" aria-hidden />
                <span>Send message</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

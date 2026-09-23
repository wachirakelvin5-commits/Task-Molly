import { motion } from 'motion/react';
import { Shield, FileText, Scale, AlertCircle, Info, Lock, Gavel, UserCheck } from 'lucide-react';

import { useDeviceType } from '../hooks/useDeviceType';

export default function TermsView() {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const sections = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: UserCheck },
    { id: 'definitions', title: 'Definitions', icon: Info },
    { id: 'platform', title: 'The TaskMolly Platform', icon: Shield },
    { id: 'accounts', title: 'User Accounts & Eligibility', icon: Lock },
    { id: 'payment', title: 'Booking & Payment Terms', icon: FileText },
    { id: 'conduct', title: 'User Obligations & Conduct', icon: AlertCircle },
    { id: 'liability', title: 'Disclaimers & Liability', icon: Scale },
    { id: 'disputes', title: 'Dispute Resolution', icon: Gavel },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto no-scrollbar">
      {/* Header */}
      <section className={`${isPhone ? 'p-6' : 'p-8 md:p-12'} bg-primary-bg/50 border-b border-warm-gray`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-1 bg-accent-gold rounded-full" />
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-rich-black/40">Legal</h2>
        </div>
        <h1 className="text-3xl md:text-4xl font-light mb-4 text-rich-black">
          Terms of <span className="text-accent-gold font-medium">Service</span>
        </h1>
        <p className="text-sm text-rich-black/60 max-w-xl leading-relaxed">
          Last Updated: April 2026. Please read these terms carefully before using the TaskMolly platform.
        </p>
      </section>

      {/* Content */}
      <div className={`flex-1 ${isPhone ? 'p-4' : 'p-6 md:p-12'} max-w-4xl mx-auto w-full`}>
        <div className={`space-y-${isPhone ? '8' : '12'}`}>
          {/* Section 1 */}
          <section id="acceptance" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <UserCheck size={20} />
              </div>
              <h3 className="text-xl font-medium">1. Acceptance of Terms</h3>
            </div>
            <div className={`prose prose-sm text-rich-black/70 leading-relaxed ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              <p>
                Welcome to TaskMolly, operated by TaskMolly Kenya Limited ("TaskMolly," "we," "us," or "our"). These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and TaskMolly governing your access to and use of the TaskMolly website, mobile application, and related services (collectively, the "Platform").
              </p>
              <p className="mt-4">
                By registering for an account, clicking "I Agree," or using the Platform in any manner, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Platform.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="definitions" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <Info size={20} />
              </div>
              <h3 className="text-xl font-medium">2. Definitions</h3>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              {[
                { term: 'Client', def: 'A User who uses the Platform to seek, book, and pay for Services.' },
                { term: 'Tasker', def: 'A User who uses the Platform to offer, provide, and receive payment for Services as an independent contractor.' },
                { term: 'Services', def: 'The domestic, professional, or other tasks offered by Taskers and requested by Clients through the Platform.' },
                { term: 'Service Contract', def: 'The direct agreement between a Client and a Tasker for the provision of a specific Service.' }
              ].map((item, i) => (
                <div key={i} className="p-4 bg-primary-bg/50 rounded-2xl border border-warm-gray">
                  <span className="block text-xs font-bold uppercase tracking-widest text-accent-gold mb-1">{item.term}</span>
                  <p className="text-sm text-rich-black/70">{item.def}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 */}
          <section id="platform" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <Shield size={20} />
              </div>
              <h3 className="text-xl font-medium">3. The TaskMolly Platform</h3>
            </div>
            <div className={`prose prose-sm text-rich-black/70 leading-relaxed ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              <p>
                TaskMolly is a technology platform that facilitates connections between Clients and independent Taskers. TaskMolly is not an employer, agency, or insurer. We do not provide the Services, employ, recommend, endorse, or control the Taskers. Taskers are independent contractors solely responsible for the manner, means, and quality of the Services they provide.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="accounts" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <Lock size={20} />
              </div>
              <h3 className="text-xl font-medium">4. User Accounts and Eligibility</h3>
            </div>
            <ul className={`space-y-3 ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              {[
                'You must be at least 18 years old and have the legal capacity to enter into a contract.',
                'You must provide accurate, current, and complete information during registration.',
                'You are responsible for safeguarding your password and for all activities under your account.',
                'You may only hold one account, and you may not create an account for anyone else.'
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm text-rich-black/70">
                  <span className="text-accent-gold font-bold">4.{i+1}</span>
                  {text}
                </li>
              ))}
            </ul>
          </section>

          {/* Section 5 */}
          <section id="payment" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-medium">5. Booking and Payment Terms</h3>
            </div>
            <div className={`space-y-4 ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              <div className="p-5 bg-rich-black text-white rounded-3xl">
                <h4 className="text-xs font-bold uppercase tracking-widest text-accent-gold mb-2">Pricing & Service Charge</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  The Tasker sets their own price. The Client agrees to pay this price plus a TaskMolly service charge, which will be clearly displayed before booking confirmation.
                </p>
              </div>
              <p className="text-sm text-rich-black/70 leading-relaxed">
                All payments are processed securely through third-party payment gateways, including M-Pesa. By providing payment information, you authorize TaskMolly to charge the full amount.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section id="conduct" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-xl font-medium">6. User Obligations and Conduct</h3>
            </div>
            <div className={`${isPhone ? 'pl-4' : 'pl-8 md:pl-14'} space-y-4`}>
              <p className="text-sm text-rich-black/70">You agree to use the Platform lawfully and ethically. You will not:</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Provide false information',
                  'Interfere with Platform operation',
                  'Harass or harm another User',
                  'Circumvent the payment system',
                  'Use the Platform for illegal purposes'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="liability" className="scroll-mt-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <Scale size={20} />
              </div>
              <h3 className="text-xl font-medium">7. Disclaimers and Limitation of Liability</h3>
            </div>
            <div className={`prose prose-sm text-rich-black/70 leading-relaxed ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              <p>
                To the maximum extent permitted by Kenyan law, TaskMolly's total liability shall be limited to the greater of (a) the total Service Charges you paid in the 6 months prior, or (b) Five Thousand Kenya Shillings (KES 5,000).
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="disputes" className="scroll-mt-20 pb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                <Gavel size={20} />
              </div>
              <h3 className="text-xl font-medium">8. Dispute Resolution</h3>
            </div>
            <div className={`prose prose-sm text-rich-black/70 leading-relaxed ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
              <p>
                TaskMolly encourages Clients and Taskers to resolve disputes directly and amicably. We may, at our sole discretion, attempt to facilitate a resolution but are under no obligation to do so.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

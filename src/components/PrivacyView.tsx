import { motion } from 'motion/react';
import { Eye, Database, Share2, ShieldCheck, UserCheck, Clock, Globe, Lock, Mail } from 'lucide-react';

import { useDeviceType } from '../hooks/useDeviceType';

export default function PrivacyView() {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const sections = [
    { title: 'Information We Collect', icon: Database },
    { title: 'How We Use Your Information', icon: Eye },
    { title: 'How We Share Your Information', icon: Share2 },
    { title: 'Your Data Protection Rights', icon: UserCheck },
    { title: 'Data Retention', icon: Clock },
    { title: 'Data Security', icon: ShieldCheck },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto no-scrollbar">
      {/* Header */}
      <section className={`${isPhone ? 'p-6' : 'p-8 md:p-12'} bg-primary-bg/50 border-b border-warm-gray`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-1 bg-accent-gold rounded-full" />
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-rich-black/40">Privacy</h2>
        </div>
        <h1 className="text-3xl md:text-4xl font-light mb-4 text-rich-black">
          Privacy <span className="text-accent-gold font-medium">Policy</span>
        </h1>
        <p className="text-sm text-rich-black/60 max-w-xl leading-relaxed">
          Your privacy is our priority. This policy explains how TaskMolly handles your personal data in accordance with the Kenya Data Protection Act, 2019.
        </p>
      </section>

      {/* Content */}
      <div className={`flex-1 ${isPhone ? 'p-4' : 'p-6 md:p-12'} max-w-4xl mx-auto w-full`}>
        <div className={`space-y-${isPhone ? '10' : '16'}`}>
          {/* Intro */}
          <section>
            <p className="text-sm text-rich-black/70 leading-relaxed italic">
              Welcome to TaskMolly. This Privacy Policy explains how we collect, use, disclose, retain, and protect your personal information when you access or use our Services.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-gold/10 rounded-2xl flex items-center justify-center text-accent-gold">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-medium">1. Information We Collect</h3>
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isPhone ? 'pl-4' : 'pl-8 md:pl-16'}`}>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-rich-black/40">Directly Provided</h4>
                <ul className="space-y-2">
                  {['Account Details', 'Verification Docs', 'Transaction Info', 'Communications'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-rich-black/70">
                      <div className="w-1.5 h-1.5 bg-accent-gold rounded-full" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-rich-black/40">Automatically Collected</h4>
                <ul className="space-y-2">
                  {['Device & Log Data', 'Usage Info', 'Location Data', 'Cookies'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-rich-black/70">
                      <div className="w-1.5 h-1.5 bg-accent-gold rounded-full" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 3. How We Use Your Information */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-gold/10 rounded-2xl flex items-center justify-center text-accent-gold">
                <Eye size={24} />
              </div>
              <h3 className="text-xl font-medium">2. How We Use Your Information</h3>
            </div>
            <div className={`${isPhone ? 'pl-4' : 'pl-8 md:pl-16'} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
              {[
                'Operate & Secure Platform',
                'Facilitate Matches',
                'Process Payments',
                'Verify Identities',
                'Send Security Alerts',
                'Legal Compliance'
              ].map((item, i) => (
                <div key={i} className="p-4 bg-primary-bg/50 rounded-2xl border border-warm-gray text-sm text-rich-black/70">
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* 4. How We Share Your Information */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-gold/10 rounded-2xl flex items-center justify-center text-accent-gold">
                <Share2 size={24} />
              </div>
              <h3 className="text-xl font-medium">3. How We Share Your Information</h3>
            </div>
            <div className={`${isPhone ? 'pl-4' : 'pl-8 md:pl-16'} space-y-4`}>
              <p className="text-sm text-rich-black/70 leading-relaxed">
                We may share your information with other users to facilitate bookings, with trusted service providers (data processors), or for legal reasons. 
                <span className="block mt-2 font-bold text-rich-black">We do not sell your personal data to third parties.</span>
              </p>
            </div>
          </section>

          {/* 5. Your Data Protection Rights */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-gold/10 rounded-2xl flex items-center justify-center text-accent-gold">
                <UserCheck size={24} />
              </div>
              <h3 className="text-xl font-medium">4. Your Data Protection Rights</h3>
            </div>
            <div className={`${isPhone ? 'pl-4' : 'pl-8 md:pl-16'} grid grid-cols-1 gap-3`}>
              {[
                { title: 'Right of Access', desc: 'Request a copy of your personal data.' },
                { title: 'Right to Correction', desc: 'Request correction of inaccurate data.' },
                { title: 'Right to Deletion', desc: 'Request deletion of your account.' },
                { title: 'Right to Object', desc: 'Object to processing for certain purposes.' }
              ].map((right, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-3xl border border-warm-gray shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-accent-gold/10 text-accent-gold flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 bg-accent-gold rounded-full" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rich-black">{right.title}</h4>
                    <p className="text-xs text-rich-black/60">{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Data Retention & Security */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                  <Clock size={20} />
                </div>
                <h3 className="text-lg font-medium">5. Data Retention</h3>
              </div>
              <p className={`text-sm text-rich-black/70 ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
                We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected or to meet legal obligations.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-medium">6. Data Security</h3>
              </div>
              <p className={`text-sm text-rich-black/70 ${isPhone ? 'pl-4' : 'pl-8 md:pl-14'}`}>
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="p-8 bg-rich-black text-white rounded-[3rem] text-center pb-20">
            <Mail className="mx-auto mb-4 text-accent-gold" size={32} />
            <h3 className="text-xl font-light mb-2">Questions?</h3>
            <p className="text-white/60 text-sm mb-6">Contact our Data Protection Officer</p>
            <div className="text-accent-gold font-bold tracking-wider md:tracking-widest text-[10px] md:text-xs uppercase break-all">
              privacy.taskmolly254@gmail.com
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

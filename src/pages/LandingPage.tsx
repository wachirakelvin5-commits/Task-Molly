import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame, animate } from 'motion/react';
import { Search, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import AIModal from '../components/AIModal';
import HeroVideo from '../components/HeroVideo';
import BlogView from '../components/BlogView';
import FunFactsView from '../components/FunFactsView';
import AboutView from '../components/AboutView';
import ContactView from '../components/ContactView';
import TermsView from '../components/TermsView';
import PrivacyView from '../components/PrivacyView';

import { useDeviceType } from '../hooks/useDeviceType';

interface LandingPageProps {
  setHideNavbar: (hide: boolean) => void;
}

export default function LandingPage({ setHideNavbar }: LandingPageProps) {
  const { isPhone, isTablet, isLaptop } = useDeviceType();
  const [selectedCard, setSelectedCard] = useState<{ title: string; content: string } | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const x = useMotionValue(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const CARD_WIDTH = 284; // 260px width + 24px gap
  const TOTAL_WIDTH = 1704; // 6 cards * 284px

  useAnimationFrame((_, delta) => {
    if (!isPaused) {
      const currentX = x.get();
      let newX = currentX - (delta * 0.05); // Speed adjustment
      
      // Seamless wrap
      if (newX <= -TOTAL_WIDTH) {
        newX += TOTAL_WIDTH;
      }
      x.set(newX);
    }
  });

  const handleManualScroll = (direction: 'left' | 'right') => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);

    const currentX = x.get();
    const targetX = direction === 'left' ? currentX + CARD_WIDTH : currentX - CARD_WIDTH;

    animate(x, targetX, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      onUpdate: (latest) => {
        if (latest > 0) x.set(latest - TOTAL_WIDTH);
        if (latest <= -TOTAL_WIDTH) x.set(latest + TOTAL_WIDTH);
      }
    });

    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 3000);
  };

  useEffect(() => {
    setHideNavbar(isAIModalOpen);
  }, [isAIModalOpen, setHideNavbar]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCard(null);
      }
    };
    if (selectedCard) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedCard]);

  const INFO_CARDS = [
    { 
      title: 'Get to Know Us', 
      content: 'Task Molly is Kenya\'s premier concierge and domestic service platform. Founded with the vision of simplifying modern living, we connect busy professionals and households with vetted, high-quality service providers. Our commitment is to excellence, reliability, and seamless service delivery.' 
    },
    { 
      title: 'How to reach us', 
      content: 'We are here to help! You can reach our support team via email at support.taskmolly254@gmail.com, or WhatsApp us at 0706220959. Our offices are open from 9:00 AM to 9:00 PM every day of the week, except on bank and national holidays.' 
    },
    { 
      title: 'Terms of Service', 
      content: `TASKMOLLY KENYA LIMITED – TERMS OF SERVICE

    Acceptance of Terms
    Welcome to TaskMolly, operated by TaskMolly Kenya Limited ("TaskMolly," "we," "us," or "our"). These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and TaskMolly governing your access to and use of the TaskMolly website, mobile application, and related services (collectively, the "Platform").
    By registering for an account, clicking "I Agree," or using the Platform in any manner, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Platform.

    Definitions
    "Client" means a User who uses the Platform to seek, book, and pay for Services.
    "Tasker" means a User who uses the Platform to offer, provide, and receive payment for Services as an independent contractor.
    "Services" means the domestic, professional, or other tasks offered by Taskers and requested by Clients through the Platform.
    "Service Contract" means the direct agreement between a Client and a Tasker for the provision of a specific Service, facilitated through the Platform.

    The TaskMolly Platform
    TaskMolly is a technology platform that facilitates connections between Clients and independent Taskers. TaskMolly is not an employer, agency, or insurer. We do not provide the Services, employ, recommend, endorse, or control the Taskers. Taskers are independent contractors solely responsible for the manner, means, and quality of the Services they provide. Clients are solely responsible for selecting a Tasker and determining the suitability of the Services.

    User Accounts and Eligibility
    4.1. You must be at least 18 years old and have the legal capacity to enter into a contract to use the Platform.
    4.2. You must provide accurate, current, and complete information during registration and keep your account updated.
    4.3. You are responsible for safeguarding your password and for all activities under your account. You must notify us immediately of any unauthorized use.
    4.4. You may only hold one account, and you may not create an account for anyone else.

    Booking and Payment Terms
    5.1. Service Requests: Clients post requests for Services. Taskers may submit offers or be invited. The Client selects a Tasker and agrees on a price, forming a Service Contract.
    5.2. Pricing & Service Charge: The Tasker sets their own price for the Service. The Client agrees to pay this price plus a TaskMolly service charge (the "Service Charge"), which will be clearly displayed before booking confirmation. The Service Charge is non-refundable except as required by law or at TaskMolly's sole discretion.
    5.3. Payment Processing: All payments are processed securely through third-party payment gateways, including M-Pesa. By providing payment information, you authorize TaskMolly to charge the full amount (Service price + Service Charge).
    5.4. Tasker Payment: Upon successful completion of a Service and Client confirmation, TaskMolly will facilitate the release of the full agreed Service price to the Tasker, subject to the Tasker's compliance with their separate Contractor Agreement (including payment of any subscription fees).

    User Obligations and Conduct
    6.1. General Conduct: You agree to use the Platform lawfully, ethically, and in good faith. You will not:

    Provide false information.

    Interfere with the Platform’s operation or security.

    Harass, abuse, or harm another User.

    Circumvent or attempt to circumvent the Platform’s payment system or fees (e.g., by soliciting or completing offline transactions).

    Use the Platform for any illegal purpose.
    6.2. Client Obligations: The Client is responsible for:

    Accurately and completely describing the Service needed.

    Providing a safe and appropriate working environment for the Tasker.

    Being present or available to provide access and necessary instructions, unless otherwise agreed.

    Paying the agreed price and Service Charge in full.
    6.3. Tasker Obligations: The Tasker is responsible for:

    Possessing the necessary skills, qualifications, licenses, and equipment to perform the Service safely and competently.

    Arriving on time and performing the Service with due care and professionalism.

    Complying with all applicable laws, including tax obligations.

    Maintaining their own insurance where prudent or required by law.

    Disclaimers and Limitation of Liability
    7.1. Platform "As Is": The Platform is provided on an "as is" and "as available" basis. We disclaim all warranties, express or implied.
    7.2. No Liability for Services: TaskMolly is not a party to the Service Contract. We expressly disclaim any liability for the acts, omissions, conduct, quality, or performance of any Tasker or Client, or for any personal injury, property damage, theft, or other loss arising from the Services or User interactions.
    7.3. Limitation of TaskMolly's Liability: To the maximum extent permitted by Kenyan law, TaskMolly's total liability to you for any claim arising from these Terms or your use of the Platform shall be limited to the greater of (a) the total Service Charges you paid to TaskMolly in the 6 months prior to the event giving rise to liability, or (b) Five Thousand Kenya Shillings (KES 5,000).

    Dispute Resolution Between Users
    8.1. Direct Resolution: TaskMolly encourages Clients and Taskers to resolve disputes directly and amicably.
    8.2. Platform Facilitation: TaskMolly may, at its sole and absolute discretion, attempt to facilitate a resolution or offer a refund/credit policy under specific circumstances. We are under no obligation to do so. Any decision we make is final.
    8.3. Release: You hereby release TaskMolly, its directors, officers, and employees from any claims, demands, and damages arising out of disputes with other Users.

    Termination and Suspension
    We may, without prior notice, suspend or terminate your account and access to the Platform if we believe you have violated these Terms, engaged in fraudulent or illegal activity, or for any other reason at our discretion.

    Intellectual Property
    All content, software, trademarks, logos, and other materials on the Platform ("TaskMolly IP") are owned by or licensed to TaskMolly. You are granted a limited, non-exclusive, non-transferable license to use the Platform for its intended purpose. You may not copy, modify, or distribute TaskMolly IP without our express written permission.

    Privacy
    Your privacy is important to us. Our collection and use of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.

    General Provisions
    12.1. Governing Law & Jurisdiction: These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes shall be subject to the exclusive jurisdiction of the courts of Kenya.
    12.2. Amendments: We may modify these Terms at any time. We will notify you of material changes via the Platform or email. Your continued use constitutes acceptance of the revised Terms.
    12.3. Severability: If any provision of these Terms is held invalid or unenforceable, the remaining provisions will remain in full force.
    12.4. Entire Agreement: These Terms, together with the Privacy Policy and the Contractor Agreement (for Taskers), constitute the entire agreement between you and TaskMolly regarding the Platform.

    Contact Us
    For questions about these Terms, please contact us at:
    Email: legal.taskmolly254@gmail.com` 
    },
    { 
      title: 'Privacy Policy', 
      content: `TASKMOLLY PRIVACY POLICY

1. Introduction
Welcome to TaskMolly. TaskMolly (“TaskMolly,” “we,” “our,” “us”) operates a digital marketplace platform that connects individuals seeking services (“Clients”) with independent service providers (“Taskers”) for domestic and professional services. This Privacy Policy explains how we, as the data controller, collect, use, disclose, retain, and protect your personal information when you access or use our website, mobile applications, and related services (collectively, the “Services”).
By using TaskMolly, you acknowledge that you have read, understood, and agree to the practices described in this Policy. If you do not agree, please do not use our Services.

2. Information We Collect
We collect information to provide and improve our Services. This includes:
Information You Provide Directly:
Account Information: Full name, phone number, email address, profile details, and photographs.
Verification Details: Identification documents (e.g., national ID, passport) where required for background checks or regulatory compliance.
Transaction Information: Payment instructions and related details (processed via third parties like M-Pesa). We do not store full payment card or PIN details.
Communications: Records of your communications with TaskMolly or other users through the platform.
Service Details: Information related to service requests, bids, reviews, and ratings.

Information Collected Automatically:
Device and Log Data: IP address, device type, operating system, browser type, unique device identifiers, and mobile network information.
Usage Information: Pages viewed, features used, time spent, and other activity logs.
Location Data: With your consent, we collect precise or approximate location data to match Clients with nearby Taskers and improve service accuracy.
Cookies and Tracking Technologies: We use cookies and similar technologies to authenticate users, remember preferences, analyze trends, and personalize your experience.

Information From Third Parties:
We may receive information from payment processors (e.g., M-Pesa payment confirmations), identity verification services, advertising and analytics partners, and social media platforms (if you link your account).

3. How We Use Your Information
We use the personal data we collect for the following purposes:
To provide, operate, maintain, and secure the TaskMolly platform.
To facilitate matches between Clients and Taskers and enable service transactions.
To process payments and transactions through trusted third-party providers.
To verify identities, conduct background checks (where applicable), and prevent fraud.
To communicate with you regarding services, updates, security alerts, and support messages.
To improve, personalize, and develop new features and services.
To comply with our legal and regulatory obligations under Kenyan law, including the Data Protection Act, 2019.

4. How We Share Your Information
We may share your information in the following limited circumstances:
With Other Users: Necessary information (e.g., name, profile, service history) is shared between Clients and Taskers to facilitate a booking.
With Service Providers (Data Processors): We engage trusted third-party vendors who act as data processors on our instructions to support our operations. This includes payment processors (M-Pesa), cloud hosting providers, analytics services, customer support tools, and marketing partners. These parties are contractually bound to protect your data.
For Legal Reasons: We may disclose information if required by law, a valid legal request, or to protect the rights, property, and safety of TaskMolly, our users, or the public. This includes cooperation with regulatory authorities and law enforcement agencies in Kenya.
Business Transfers: In connection with a merger, acquisition, or sale of assets, your information may be transferred as a business asset.
With Your Consent: We will share information with third parties when you direct us to do so.
We do not sell your personal data to third parties.

5. Your Data Protection Rights
In accordance with the Kenya Data Protection Act, 2019, you have the following rights regarding your personal data:
Right of Access: You may request a copy of the personal data we hold about you.
Right to Correction: You may request correction of inaccurate or incomplete data.
Right to Deletion: You may request the deletion of your account and associated personal data, subject to our need to retain it for legitimate business or legal reasons (see Section 6).
Right to Object to Processing: You may object to our processing of your personal data for certain purposes, such as direct marketing.
Right to Data Portability: Where applicable, you may request the transfer of your data to another service provider in a structured, machine-readable format.
Right to Withdraw Consent: Where processing is based on your consent, you may withdraw it at any time.
To exercise any of these rights, please contact us using the details in Section 12. We will respond to your request within the timeframe required by law.

6. Data Retention
We retain your personal data only for as long as is necessary to:
Fulfill the purposes for which it was collected.
Provide you with the Services.
Meet our legal, regulatory, tax, accounting, or reporting obligations under Kenyan law.
Resolve disputes and enforce our agreements (including our Terms of Service).
When retention is no longer necessary, we will securely delete or anonymize your data.

7. International Data Transfers
Your information may be transferred to, stored, and processed in countries other than Kenya, where our servers or third-party service providers are located. We ensure such transfers are subject to appropriate safeguards as required by the Data Protection Act, 2019, such as through the use of standard contractual clauses or your explicit consent.

8. Data Security
We implement appropriate administrative, technical, and organizational measures designed to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.

9. Children’s Privacy
Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal data, we will take steps to delete such information.

10. Links to Other Websites
Our platform may contain links to third-party websites. This Privacy Policy does not apply to those sites. We encourage you to review the privacy policies of any website you visit.

11. Dispute Resolution and Governing Law
This Privacy Policy and any disputes related to the processing of your personal data shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute shall be subject to the exclusive jurisdiction of the courts of Kenya.

12. Contact Us
If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer at:
Email: privacy.taskmolly254@gmail.com

13. Changes to This Policy
We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our platform and updating the "Last Updated" date. Your continued use of the Services after such changes constitutes your acceptance of the revised policy.` 
    },
    { 
      title: 'Blog', 
      content: 'Stay updated with the latest tips on home maintenance, lifestyle hacks, and company news. Our blog features expert advice on everything from deep cleaning techniques to managing your household staff effectively.' 
    },
    { 
      title: 'Fun Facts', 
      content: 'Did you know? Task Molly has completed over 10,000 tasks across Nairobi! Our most requested service is Deep Cleaning, and our fastest response time for an emergency plumbing request was just 18 minutes.' 
    },
  ];

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-white">
      {/* Hero Section */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 overflow-hidden">
        <HeroVideo />

        {/* Tagline - Positioned near the top navbar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute top-[100px] z-10 text-center w-full"
        >
          <h1 
            className="text-[46px] md:text-[58px] font-normal tracking-tight leading-tight text-[#000000]"
            style={{ 
              textShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 5px rgba(255,255,255,0.4)' 
            }}
          >
            <span className="relative left-2 md:left-4">You Relax.</span> <span className="text-accent-gold" style={{ WebkitTextStroke: '1px black', paintOrder: 'stroke fill' }}>
              Nitakupanga!
            </span>
          </h1>
        </motion.div>

        {/* Concierge Section - Centered in the page */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 text-center max-w-4xl w-full"
        >
          {/* AI Search Bar with Blurred Placeholder and Cursor */}
          <div className="relative max-w-2xl mx-auto group">
            <div className="relative">
              <input 
                type="text" 
                className="w-full bg-white/60 backdrop-blur-md border border-warm-gray rounded-full px-10 py-6 text-xl focus:outline-none focus:border-accent-gold transition-all shadow-2xl group-hover:shadow-accent-gold/20 cursor-pointer"
                onClick={() => setIsAIModalOpen(true)}
                readOnly
              />
              {/* Custom Placeholder with Blur and Cursor */}
              <div 
                className="absolute inset-0 flex items-center px-10 pointer-events-none"
                onClick={() => setIsAIModalOpen(true)}
              >
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-[2px] h-7 bg-accent-gold mr-1"
                />
                <span className="text-xl text-rich-black/40 blur-[1.5px] select-none">
                  Add your service request
                </span>
              </div>
            </div>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-accent-gold text-white p-4 rounded-full hover:scale-105 transition-transform shadow-lg"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Search size={24} />
            </button>
          </div>

          <AnimatePresence>
            {isAIModalOpen && (
              <AIModal onClose={() => setIsAIModalOpen(false)} />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info Cards - Integrated into the bottom of the screen */}
        {!isAIModalOpen && (
          <div className="absolute bottom-0 left-0 right-0 py-12 overflow-hidden bg-gradient-to-t from-white via-white/80 to-transparent group/carousel">
            {/* Navigation Arrows */}
            <button 
              onClick={() => handleManualScroll('left')}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white/80 backdrop-blur-md border border-warm-gray rounded-full text-rich-black hover:text-accent-gold hover:border-accent-gold transition-all opacity-0 group-hover/carousel:opacity-100 shadow-lg"
              aria-label="Scroll Left"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => handleManualScroll('right')}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white/80 backdrop-blur-md border border-warm-gray rounded-full text-rich-black hover:text-accent-gold hover:border-accent-gold transition-all opacity-0 group-hover/carousel:opacity-100 shadow-lg"
              aria-label="Scroll Right"
            >
              <ChevronRight size={24} />
            </button>

            <div className="relative flex">
              <motion.div 
                style={{ x }}
                className="flex gap-6 whitespace-nowrap px-4"
              >
                {[...INFO_CARDS, ...INFO_CARDS, ...INFO_CARDS].map((card, i) => (
                  <button 
                    key={`${card.title}-${i}`}
                    onClick={() => setSelectedCard(card)}
                    className="flex-shrink-0 w-[260px] p-6 border border-warm-gray bg-white/90 hover:border-accent-gold hover:shadow-xl rounded-2xl transition-all text-left group backdrop-blur-sm"
                  >
                    <h3 className="text-lg font-medium mb-1 group-hover:text-accent-gold transition-colors">{card.title}</h3>
                    <p className="text-[10px] text-rich-black/40 uppercase tracking-[0.2em]">Learn More</p>
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-rich-black/40 backdrop-blur-sm"
            />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`relative rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 ${
                  selectedCard.title === 'Get to Know Us' ? 'bg-[#D1C7BD]' : 
                  selectedCard.title === 'Blog' ? 'bg-[#0d0d0d]' :
                  'bg-white'
                } ${
                  isPhone ? 'w-full h-[90dvh] p-6' : 
                  isTablet ? 'w-[90vw] max-w-3xl h-[80dvh] p-8' : 
                  'w-[90vw] max-w-5xl h-[80dvh] p-12'
                }`}
              >
              <button 
                onClick={() => setSelectedCard(null)}
                className={`absolute top-4 right-4 md:top-8 md:right-8 transition-colors z-[110] ${
                  selectedCard.title === 'Get to Know Us' || selectedCard.title === 'Blog' ? 'text-white/60 hover:text-white' : 'text-rich-black/20 hover:text-rich-black'
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <h2 className={`${
                selectedCard.title === 'Get to Know Us' ? 'font-bold text-white' : 
                selectedCard.title === 'Blog' ? 'font-light text-accent-gold' :
                'font-light text-[#FF991C]'
              } ${
                isPhone ? 'text-2xl mb-4' : 'text-4xl mb-8'
              }`}>{selectedCard.title}</h2>

              {selectedCard.title === 'Blog' ? (
                <div className={`${isPhone ? 'h-[70dvh]' : 'h-[75dvh]'} -mx-6 md:-mx-12`}>
                  <BlogView />
                </div>
              ) : selectedCard.title === 'Fun Facts' ? (
                <div className={`${isPhone ? 'h-[70dvh]' : 'h-[75dvh]'} -mx-6 md:-mx-12`}>
                  <FunFactsView />
                </div>
              ) : selectedCard.title === 'Get to Know Us' ? (
                <div className={`${isPhone ? 'h-[70dvh]' : 'h-[75dvh]'} -mx-6 md:-mx-12`}>
                  <AboutView />
                </div>
              ) : selectedCard.title === 'How to reach us' ? (
                <div className={`${isPhone ? 'h-[70dvh]' : 'h-[75dvh]'} -mx-6 md:-mx-12`}>
                  <ContactView />
                </div>
              ) : selectedCard.title === 'Terms of Service' ? (
                <div className={`${isPhone ? 'h-[70dvh]' : 'h-[75dvh]'} -mx-6 md:-mx-12`}>
                  <TermsView />
                </div>
              ) : selectedCard.title === 'Privacy Policy' ? (
                <div className={`${isPhone ? 'h-[70dvh]' : 'h-[75dvh]'} -mx-6 md:-mx-12`}>
                  <PrivacyView />
                </div>
              ) : (
                <>
                  <div className="prose prose-sm md:prose-base text-rich-black/70 leading-relaxed max-h-[75dvh] overflow-y-auto pr-2 md:pr-4 whitespace-pre-wrap no-scrollbar">
                    {selectedCard.content}
                  </div>
                  <div className="mt-12 pt-8 border-t border-warm-gray">
                    <button 
                      onClick={() => setSelectedCard(null)}
                      className="bg-rich-black text-white px-8 py-3 rounded-full hover:bg-rich-black/90 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

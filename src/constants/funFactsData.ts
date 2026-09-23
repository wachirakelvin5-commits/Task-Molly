export interface FunFact {
  id: number;
  category: 'plumbing' | 'electrical' | 'cleaning' | 'laundry' | 'firesafety';
  text: string;
  source: string;
  year: string;
  verifiedBy?: string;
  critical?: boolean;
  linkText: string;
  linkUrl: string;
  icon: string;
}

export const FUN_FACTS: FunFact[] = [
  // Plumbing
  {
    id: 1,
    category: 'plumbing',
    text: 'A single dripping tap can waste 15-20 litres of water per day — enough to fill 10 standard cooking pots.',
    source: 'WASREB',
    year: '2024',
    verifiedBy: 'In-house plumber',
    linkText: 'Book a plumber to fix that drip',
    linkUrl: '/providers?service=Plumber',
    icon: 'Droplets'
  },
  {
    id: 2,
    category: 'plumbing',
    text: "Kenya loses over 40% of treated water to leaks before it reaches homes — one of Africa's highest rates.",
    source: 'WASREB 2024 Report',
    year: '2024',
    linkText: 'Book leak detection service',
    linkUrl: '/providers?service=Plumber',
    icon: 'Waves'
  },
  {
    id: 3,
    category: 'plumbing',
    text: 'The Water Tribunal in Kenya has never rejected a consumer complaint filed within 30 days of a dispute.',
    source: 'Water Services Regulations 2025',
    year: '2025',
    verifiedBy: 'Legal expert',
    linkText: 'Know your water rights',
    linkUrl: '/blog/water-regulations-kenya',
    icon: 'Scale'
  },
  {
    id: 4,
    category: 'plumbing',
    text: 'Installing a dual-flush toilet can cut household water use by 67% compared to old single-flush models.',
    source: 'KEBS Standards',
    year: '2023',
    linkText: 'Book toilet installation',
    linkUrl: '/providers?service=Plumber',
    icon: 'CheckCircle'
  },
  {
    id: 5,
    category: 'plumbing',
    text: 'Borehole owners in Kenya are legally required to meter and report abstraction — but only 12% currently comply.',
    source: 'WASREB Estimate 2024',
    year: '2024',
    linkText: 'Borehole compliance service',
    linkUrl: '/providers?service=Plumber',
    icon: 'FileText'
  },
  // Electrical
  {
    id: 6,
    category: 'electrical',
    text: "80% of Kenya's 153 annual electrical accidents come from just three causes: poor safety culture, fallen lines, and substandard customer wiring.",
    source: 'EPRA 2024 Report',
    year: '2024',
    verifiedBy: 'Licensed electrician',
    linkText: 'Book wiring inspection',
    linkUrl: '/providers?service=Electrician',
    icon: 'Zap'
  },
  {
    id: 7,
    category: 'electrical',
    text: "Your home insurance becomes void for electrical fires if you cannot produce a licensed electrician's completion certificate.",
    source: 'EPRA Regulations',
    year: '2024',
    critical: true,
    linkText: 'Read: Why certificates matter',
    linkUrl: '/blog/electrical-safety-guide',
    icon: 'AlertTriangle'
  },
  {
    id: 8,
    category: 'electrical',
    text: 'The average Kenyan home has 23 electrical devices plugged in at any time — double the number from 2015.',
    source: 'KEBS Survey 2024',
    year: '2024',
    linkText: 'Book home electrical safety audit',
    linkUrl: '/providers?service=Electrician',
    icon: 'Plug'
  },
  {
    id: 9,
    category: 'electrical',
    text: "Kenya's grid now serves 9.8 million customers — but 80% of accidents happen in just 3% of poorly wired homes.",
    source: 'EPRA Statistical Report',
    year: '2024',
    linkText: 'Schedule rewiring',
    linkUrl: '/providers?service=Electrician',
    icon: 'Home'
  },
  {
    id: 10,
    category: 'electrical',
    text: 'LED bulbs use 75% less energy than incandescents and last 25x longer. A single LED replacement saves Sh1,500 per year.',
    source: 'MEPS Standards',
    year: '2024',
    linkText: 'Book LED upgrade',
    linkUrl: '/providers?service=Electrician',
    icon: 'Lightbulb'
  },
  // Cleaning
  {
    id: 11,
    category: 'cleaning',
    text: 'The average Nairobi home contains over 200,000 dust mites — most living in mattresses and carpets. Professional deep cleaning removes 98% of them.',
    source: 'Industry Hygiene Study 2024',
    year: '2024',
    verifiedBy: 'Cleaning supervisor',
    linkText: 'Book deep cleaning',
    linkUrl: '/providers?service=Home%20Cleaning',
    icon: 'Sparkles'
  },
  {
    id: 12,
    category: 'cleaning',
    text: 'Kitchen sponges harbour more bacteria than toilet seats. Verified cleaning services change sponges after every kitchen.',
    source: 'CDC / Local Platform Data',
    year: '2024',
    linkText: 'Book standard cleaning',
    linkUrl: '/providers?service=Home%20Cleaning',
    icon: 'Trash2'
  },
  {
    id: 13,
    category: 'cleaning',
    text: 'Homes with professional weekly cleaning report 73% fewer sick days among residents.',
    source: 'Kenya Health Survey 2024',
    year: '2024',
    linkText: 'Start weekly cleaning subscription',
    linkUrl: '/providers?service=Home%20Cleaning',
    icon: 'Heart'
  },
  {
    id: 14,
    category: 'cleaning',
    text: 'The "5-second rule" is a myth — bacteria transfer happens instantly. Professional cleaners sanitize surfaces with dwell time (3-5 minutes).',
    source: 'KEPSA Hygiene Standards',
    year: '2023',
    linkText: 'Read: Proper sanitization guide',
    linkUrl: '/blog/house-cleaning-verification',
    icon: 'ShieldCheck'
  },
  {
    id: 15,
    category: 'cleaning',
    text: 'Most "green" cleaning products sold in Kenyan supermarkets are unregulated. Verified cleaners use KEBS-certified eco-products only.',
    source: 'KEBS',
    year: '2024',
    linkText: 'Book eco-friendly cleaning',
    linkUrl: '/providers?service=Home%20Cleaning',
    icon: 'Leaf'
  },
  // Laundry
  {
    id: 16,
    category: 'laundry',
    text: "A single commercial laundry cycle in Kenya uses 60 litres of water — enough for one person's daily drinking water for 30 days.",
    source: 'Water Services Regulations',
    year: '2025',
    linkText: 'Book water-efficient laundry',
    linkUrl: '/providers?service=Mama%20Fua',
    icon: 'Droplet'
  },
  {
    id: 17,
    category: 'laundry',
    text: 'Modern AI-powered laundromats in Nairobi reduce water use by 40% and energy by 30% compared to home washing.',
    source: 'Hotpoint/LG 2025',
    year: '2025',
    linkText: 'Find AI-powered laundromat near you',
    linkUrl: '/providers?service=Mama%20Fua',
    icon: 'Cpu'
  },
  {
    id: 18,
    category: 'laundry',
    text: 'The hottest day for dry cleaning in Kenya is the Monday after Easter (post-travel cleaning rush).',
    source: 'Industry Data 2024',
    year: '2024',
    linkText: 'Book post-travel laundry',
    linkUrl: '/providers?service=Mama%20Fua',
    icon: 'Calendar'
  },
  {
    id: 19,
    category: 'laundry',
    text: "100% of wedding gowns professionally cleaned in Kenya show some colour change — it's normal and managed with colour-safe processes.",
    source: 'Professional Dry Cleaners Association',
    year: '2024',
    linkText: 'Book wedding gown cleaning',
    linkUrl: '/providers?service=Mama%20Fua',
    icon: 'Star'
  },
  {
    id: 20,
    category: 'laundry',
    text: 'Laundry subscription services in Nairobi have grown 300% since 2022 — busy professionals now outsource 4+ loads weekly.',
    source: 'Platform Analytics 2025',
    year: '2025',
    linkText: 'Start laundry subscription',
    linkUrl: '/providers?service=Mama%20Fua',
    icon: 'Package'
  },
  // Fire Safety
  {
    id: 21,
    category: 'firesafety',
    text: 'Most apartment fires in Nairobi spread because stairwell doors were propped open — a practice that violates fire codes.',
    source: 'County Fire Regulations',
    year: '2024',
    critical: true,
    linkText: 'Read: Home fire safety guide',
    linkUrl: '/blog/fire-safety-compliance',
    icon: 'Flame'
  },
  {
    id: 22,
    category: 'firesafety',
    text: 'A stair pressurization fan costs Sh150,000 to install but can save 30+ lives in a single fire.',
    source: 'Fire Engineer Standards',
    year: '2023',
    linkText: 'Book fire safety consultation',
    linkUrl: '/providers?service=Security%20Technician',
    icon: 'Wind'
  },
  {
    id: 23,
    category: 'firesafety',
    text: 'Only 1 in 5 Nairobi apartments have a legally required fire safety certificate.',
    source: 'County Audit 2024',
    year: '2024',
    linkText: 'Get fire safety certificate',
    linkUrl: '/providers?service=Security%20Technician',
    icon: 'FileCheck'
  },
  {
    id: 24,
    category: 'firesafety',
    text: 'Your house cleaner should know two escape routes from every room — ask them during the next booking.',
    source: 'Fire Safety Best Practices',
    year: '2024',
    linkText: 'Download cleaner safety checklist',
    linkUrl: '/blog/fire-safety-compliance',
    icon: 'Map'
  },
  {
    id: 25,
    category: 'firesafety',
    text: 'Wet risers (firefighting water pipes in tall buildings) must be tested monthly. 90% of failures happen because owners forget.',
    source: 'Fire Safety Regulations',
    year: '2024',
    linkText: 'Schedule fire equipment maintenance',
    linkUrl: '/providers?service=Security%20Technician',
    icon: 'Activity'
  }
];

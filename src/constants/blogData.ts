export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'economic-reality-domestic-work',
    title: 'The Sh2.54 Trillion Hidden Economy: The Value of Domestic Work in Kenya',
    excerpt: 'Understanding the massive economic weight of household services in Kenya and why it matters for our GDP.',
    date: 'April 12, 2026',
    readTime: '5 min read',
    category: 'Economy',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop',
    content: `
The domestic services industry in Kenya is undergoing a remarkable transformation. From house cleaning and laundry to plumbing and electrical work, professional services are becoming essential to modern Kenyan life. 

### The Economic Weight
What makes this industry particularly fascinating is its economic weight—recent government data reveals that unpaid domestic work in Kenya is valued at an astounding **Sh2.54 trillion annually**, representing nearly a quarter (23.1%) of the country's total GDP.

### Key Findings from KNBS
The Kenya National Bureau of Statistics (KNBS) found that:
* Women spent **25.8 billion hours** on unpaid domestic work compared to 4.8 billion hours by men.
* If compensated, each woman would earn **Sh118,845 annually** versus Sh22,676 for men.
* The "clothing services" category (laundry and garment care) alone is valued at Sh353.1 billion annually—equivalent to 3.2% of the country's GDP.

Understanding these numbers helps us appreciate the vital role domestic service providers play in our economy and why professionalizing this sector is a win for everyone.
    `
  },
  {
    id: 'house-cleaning-verification',
    title: 'Hiring House Cleaners in Kenya: 7 Things You Must Verify',
    excerpt: 'A guide to trust, safety, and professional standards when bringing a cleaning service into your home.',
    date: 'April 10, 2026',
    readTime: '6 min read',
    category: 'Cleaning',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2340&auto=format&fit=crop',
    content: `
The house cleaning sector has become increasingly professionalized, with platforms now offering verified, background-checked cleaners. This represents a significant shift from informal arrangements.

### What to Look For When Hiring

1. **Verification and Reviews**
   Before booking any cleaner, ensure they are verified and have authentic client reviews. Look for platforms that conduct background checks and display ratings from real customers.

2. **Matching Services to Your Needs**
   Not all cleaning is equal. A reputable service should clearly distinguish between:
   * General cleaning (routine maintenance)
   * Deep cleaning (thorough, intensive cleaning)
   * Move-in/move-out cleaning
   * Post-construction cleaning

3. **Local Availability**
   Choose services with cleaners in your specific area—whether Nairobi's Kilimani, Syokimau, Kisumu, or Eldoret.

4. **Communication and Professionalism**
   Red flags include slow response times, vague service descriptions, or reluctance to provide detailed quotes.

5. **Hygiene and Safety Protocols**
   Ask potential cleaners: Do they wear gloves, masks, or shoe covers? Are their detergents safe for children and pets?

6. **Experience Matters**
   Companies with several years of operation have typically refined their techniques and established reliable processes.

7. **Contract Transparency**
   Review contracts carefully. They should clearly outline scope of work, pricing, payment terms, and cancellation policies.
    `
  },
  {
    id: 'laundromat-revolution',
    title: 'The Laundromat Revolution: How Tech is Changing Kenyan Laundry',
    excerpt: 'Kenya’s laundry sector is experiencing explosive growth, driven by urbanization and AI-powered innovation.',
    date: 'April 8, 2026',
    readTime: '4 min read',
    category: 'Innovation',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=2071&auto=format&fit=crop',
    content: `
Kenya's laundry sector is experiencing explosive growth, driven by urbanization and time-pressed consumers. Major appliance manufacturers are actively supporting this expansion.

### Industry Growth
Hotpoint Appliances, in partnership with LG Electronics, has supported the setup of over **120 laundromats** across Kenya in just three years. These range from small startups with a few machines to larger multi-outlet businesses.

### Smart Technology Adoption
The industry is embracing AI-powered commercial laundry systems that:
* Optimize wash cycles automatically
* Reduce water and energy consumption
* Extend equipment lifespan
* Appeal to eco-conscious customers

### Modern Service Models
The Kenyan market now offers multiple service options:
* Dry cleaning (garments requiring chemical cleaning)
* Laundry services (wash-and-fold)
* Self-service laundromats
* Online booking with pickup and delivery

The market now includes subscription services and on-demand pickup/delivery options—ideal for busy professionals and families.
    `
  },
  {
    id: 'electrical-safety-guide',
    title: 'Electrical Safety at Home: Why Your Insurance Depends on a License',
    excerpt: 'Electricity-related accidents are on the rise. Learn the critical compliance requirements to keep your home safe.',
    date: 'April 5, 2026',
    readTime: '7 min read',
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop',
    content: `
Kenya is nearing 10 million grid-connected customers. However, increased connectivity has brought increased risks. According to recent reports, electricity-related accidents have spiked significantly.

### The Safety Reality
80% of accidents are attributed to just three factors:
1. Poor safety culture within organizations (38.56%)
2. Defective or fallen power lines (26.80%)
3. Substandard customer wiring (16.34%)

### Critical Compliance Requirements
The Energy and Petroleum Regulatory Authority (EPRA) now requires:
* Use of **licensed electrical workers** for all home installations.
* Issuance of **completion and test certificates** after any electrical work.
* Adherence to Minimum Energy Performance Standards (MEPS) for all electrical products.

### Why Licensing Matters for Insurance
**Crucial information:** If your property is destroyed by an electrical fault, your insurance company will likely deny compensation if you cannot prove engagement of a licensed electrical contractor. Always verify licenses through EPRA's online database.
    `
  },
  {
    id: 'water-regulations-kenya',
    title: 'Navigating Water Regulations: Your Rights as a Kenyan Homeowner',
    excerpt: 'Understanding the legal framework and consumer protections in Kenya’s water services sector.',
    date: 'April 3, 2026',
    readTime: '5 min read',
    category: 'Legal',
    image: 'https://images.unsplash.com/photo-1538300342682-cf57afb97285?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    content: `
Kenya's water services operate under comprehensive regulations that protect consumers—but only if you know your rights. The Water (Services) Regulations (Legal Notice No. 54 of 2025) provide a detailed legal framework.

### Key Protections for Consumers

* **Licensing Requirements:** Any entity providing water services must obtain a license from the Water Services Regulatory Board (WASREB). This includes private water providers and borehole operators.
* **Tariff Regulation:** Water tariffs are subject to regulatory review. Providers must apply for regular tariff reviews, protecting consumers from arbitrary price increases.
* **Complaints Mechanism:** The regulations establish formal complaints mechanisms. If aggrieved, consumers can appeal to the Water Tribunal within thirty days.
* **Quality Standards:** Water quality and service standards are mandated for both urban and rural areas.

### What to Look For in Plumbing
When hiring, verify their water service installation licence and wastewater compliance. Proper effluent and wastewater disposal is legally required.
    `
  },
  {
    id: 'fire-safety-compliance',
    title: 'Is Your Apartment Safe? Fire Safety Standards for Modern Living',
    excerpt: 'Critical fire safety and building compliance standards every Kenyan homeowner and tenant should know.',
    date: 'April 1, 2026',
    readTime: '4 min read',
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1658218635253-64728f6234be?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    content: `
While often overlooked, fire safety compliance is critical for apartment dwellers and homeowners, particularly in multi-story buildings.

### Current Requirements
Based on regulatory standards applicable in Kenya:
* Buildings should have at least **two protected staircases** accessible from each floor.
* **Stair pressurization systems** prevent smoke infiltration using mechanical fans.
* Tall buildings require designated **refuge floors** and firefighting lifts.
* Fire service access roads and hydrant layouts must be in place.

### Accessibility Requirements
Property owners should ensure:
* Step-free access to main entrances.
* Accessible routes in public areas.
* Ramp slopes meeting standards (maximum 1:12 ratio).

Fire safety certificates must be issued by a fire engineer, and commissioning requires full smoke tests and stair pressurization tests with documented records.
    `
  }
];

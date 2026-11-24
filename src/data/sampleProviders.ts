// SAMPLE provider profiles for the task-molly provider list (pen icon → a service).
// These are placeholders until real providers are listed: the names are made up and the
// page labels every one of them "Sample profile". Prices are example prices in KES.
import { PROVIDER_LIST_SERVICES, ServiceItem } from './serviceCatalog';

export interface PremiumService {
  name: string;
  price: number; // KES
  unit?: string; // e.g. "per visit"
}

export interface SampleProvider {
  id: string;
  serviceId: string;
  name: string;
  photo: string;
  tagline: string;
  yearsExperience: number;
  rating: number;
  jobsDone: number;
  area: string;
  highlights: string[];
  premium: PremiumService[];
}

interface ServiceShowcase {
  headline: string;
  highlights: string[];
  menu: PremiumService[];
}

// Poster headline, poster highlights and the premium menu each provider draws from.
const SHOWCASE: Record<string, ServiceShowcase> = {
  errand_runner: { headline: 'Your to-do list, done', highlights: ['Same-day runs', 'Receipts sent', 'Queue so you don’t'], menu: [
    { name: 'Half-day errand run (up to 4 stops)', price: 1500 }, { name: 'Full-day concierge', price: 2800 },
    { name: 'Bill payments & queueing', price: 800, unit: 'per errand' }, { name: 'Parcel pick-up & drop-off', price: 600 }, { name: 'Document filing at offices', price: 1200 } ] },
  shopping: { headline: 'Shopping without the traffic', highlights: ['Photo of every item', 'Price-checked', 'Delivered to your door'], menu: [
    { name: 'Personal shopper (up to 15 items)', price: 1200 }, { name: 'Mall run & returns', price: 1500 },
    { name: 'Gift shopping & wrapping', price: 1800 }, { name: 'Household restock trip', price: 1000 }, { name: 'Express shopping (2 hrs)', price: 2000 } ] },
  grocery_shopping: { headline: 'Fresh groceries, your list', highlights: ['Market-fresh produce', 'Substitutions checked with you', 'Cold items kept cold'], menu: [
    { name: 'Supermarket shop (up to 25 items)', price: 900 }, { name: 'Market produce run (Wakulima / City Market)', price: 1200 },
    { name: 'Weekly grocery subscription', price: 3200, unit: 'per month' }, { name: 'Butcher & fishmonger pick-up', price: 700 }, { name: 'Same-day express groceries', price: 1500 } ] },
  mama_fua: { headline: 'Clean clothes, zero stress', highlights: ['Hand wash & machine wash', 'Folded & sorted', 'Gentle on fabrics'], menu: [
    { name: 'Hand wash & fold (up to 30 items)', price: 1200 }, { name: 'Bedding & curtains wash', price: 1500 },
    { name: 'Weekly mama fua visit', price: 4200, unit: 'per month' }, { name: 'Baby clothes gentle wash', price: 1000 }, { name: 'Wash, dry & iron combo', price: 1800 } ] },
  carpet_sofa_cleaning: { headline: 'Sofas that feel new again', highlights: ['Deep extraction clean', 'Stain treatment', 'Fast drying'], menu: [
    { name: '5-seater sofa deep clean', price: 3500 }, { name: 'Carpet shampoo (up to 6x9 ft)', price: 2000 },
    { name: 'Mattress sanitising (queen)', price: 2500 }, { name: 'Car seat interior clean', price: 2800 }, { name: 'Fabric protection spray', price: 1500 } ] },
  laundry_ironing: { headline: 'Crisp, pressed, ready', highlights: ['Pick-up & delivery', 'Steam ironing', 'Shirts on hangers'], menu: [
    { name: 'Wash & iron (per 5 kg)', price: 900 }, { name: 'Ironing only (up to 20 pieces)', price: 700 },
    { name: 'Suits & delicates press', price: 500, unit: 'per piece' }, { name: 'Weekly laundry plan', price: 3400, unit: 'per month' }, { name: 'Same-day laundry', price: 1400 } ] },
  indoor_cleaning: { headline: 'A spotless home, every time', highlights: ['Kitchen & bathrooms', 'Eco products', 'Vetted cleaners'], menu: [
    { name: 'Standard clean (2-bedroom)', price: 2500 }, { name: 'Deep clean (3-bedroom)', price: 5500 },
    { name: 'Move-in / move-out clean', price: 7000 }, { name: 'Kitchen degrease & oven clean', price: 2200 }, { name: 'Windows & glass (inside)', price: 1500 } ] },
  cook_meal: { headline: 'Home-cooked, done for you', highlights: ['Kenyan & continental', 'Meal-prep for the week', 'Clean kitchen after'], menu: [
    { name: 'Weekly meal prep (5 days, family of 4)', price: 4500 }, { name: 'Dinner party chef (up to 10 guests)', price: 8000 },
    { name: 'Daily cook (lunch & dinner)', price: 1800, unit: 'per day' }, { name: 'Baking session (cakes & pastries)', price: 2500 }, { name: 'Special-diet meal plan', price: 5000 } ] },
  plumbing_repairs: { headline: 'Leaks fixed, water flowing', highlights: ['Same-day call-outs', 'Clean workmanship', '30-day guarantee'], menu: [
    { name: 'Leak repair (tap / pipe)', price: 1500 }, { name: 'Blocked drain or toilet', price: 2000 },
    { name: 'Water tank cleaning (5,000 L)', price: 4000 }, { name: 'Instant shower fitting', price: 2500 }, { name: 'Bathroom fittings install', price: 3500 } ] },
  electrical_solar: { headline: 'Safe power, done right', highlights: ['Certified electricians', 'Fault-finding', 'Neat wiring'], menu: [
    { name: 'Socket / switch install', price: 1000, unit: 'per point' }, { name: 'Fault finding & repair', price: 2000 },
    { name: 'Light fittings install (up to 5)', price: 2500 }, { name: 'Solar backup check-up', price: 3000 }, { name: 'Full house rewiring survey', price: 3500 } ] },
  fundi_handyman: { headline: 'Small fixes, big difference', highlights: ['Bring the tools', 'Doors, shelves, curtains', 'Same-week visits'], menu: [
    { name: 'Handyman hour', price: 1200, unit: 'per hour' }, { name: 'Curtain rail & blinds fitting', price: 1500 },
    { name: 'Door lock change', price: 1800 }, { name: 'Shelf & mirror mounting', price: 1200 }, { name: 'Minor tiling repair', price: 2500 } ] },
  carpenter: { headline: 'Woodwork made to fit', highlights: ['Custom furniture', 'Repairs & refinishing', 'Quality timber'], menu: [
    { name: 'Kitchen cabinet repair', price: 3000 }, { name: 'Custom shelving (per metre)', price: 4500 },
    { name: 'Door planing & re-hanging', price: 2000 }, { name: 'Bed frame repair', price: 2500 }, { name: 'Wardrobe assembly', price: 3500 } ] },
  appliance_repair: { headline: 'Appliances back in action', highlights: ['Fridges, washers, cookers', 'Genuine spares', 'Diagnosis first'], menu: [
    { name: 'Diagnosis visit', price: 1000 }, { name: 'Washing machine repair', price: 3000 },
    { name: 'Fridge gas re-fill & service', price: 4500 }, { name: 'Cooker / oven repair', price: 2500 }, { name: 'Microwave repair', price: 1800 } ] },
  tv_mounting: { headline: 'Mounted level, wires hidden', highlights: ['All TV sizes', 'Bracket supplied', 'Cable management'], menu: [
    { name: 'TV mounting (up to 55")', price: 2000 }, { name: 'TV mounting (65" and above)', price: 3000 },
    { name: 'Bracket + mounting package', price: 4500 }, { name: 'Soundbar & decoder setup', price: 1500 }, { name: 'Hidden-cable trunking', price: 1800 } ] },
  movers_relocation: { headline: 'Moving day, sorted', highlights: ['Packing & wrapping', 'Careful crew', 'Truck included'], menu: [
    { name: 'Studio / bedsitter move', price: 8000 }, { name: '2-bedroom move (within Nairobi)', price: 18000 },
    { name: 'Packing service only', price: 5000 }, { name: 'Furniture disassembly & assembly', price: 3500 }, { name: 'Single-item delivery', price: 2500 } ] },
  pest_control: { headline: 'Pests out, peace in', highlights: ['Child & pet-safe options', 'Follow-up visit', 'Certified chemicals'], menu: [
    { name: 'Bedbug treatment (2-bedroom)', price: 5000 }, { name: 'Cockroach gel treatment', price: 3000 },
    { name: 'Full house fumigation', price: 8000 }, { name: 'Rodent control', price: 3500 }, { name: 'Termite treatment (compound)', price: 9000 } ] },
  gardening_landscaping: { headline: 'A compound you’ll love', highlights: ['Lawn care', 'Hedges & flowers', 'Regular visits'], menu: [
    { name: 'Lawn mowing & edging', price: 1500 }, { name: 'Hedge trimming', price: 1800 },
    { name: 'Monthly garden care (4 visits)', price: 5500, unit: 'per month' }, { name: 'Flower bed planting', price: 3000 }, { name: 'Compound clean-up', price: 2500 } ] },
  security_cctv: { headline: 'See your home from anywhere', highlights: ['HD cameras', 'Phone viewing', 'Neat installation'], menu: [
    { name: '4-camera CCTV install', price: 25000 }, { name: 'CCTV health check & repair', price: 3000 },
    { name: 'Video doorbell install', price: 4000 }, { name: 'Electric fence check-up', price: 3500 }, { name: 'Alarm system setup', price: 12000 } ] },
  house_painting: { headline: 'Fresh walls, fresh start', highlights: ['Clean edges', 'Furniture covered', 'Quality paints'], menu: [
    { name: 'Room repaint (walls, per room)', price: 6000 }, { name: 'Full 2-bedroom repaint', price: 28000 },
    { name: 'Accent / feature wall', price: 3500 }, { name: 'Gate & grill painting', price: 4500 }, { name: 'Wall crack & skim repair', price: 2500 } ] },
  airbnb_cleaning: { headline: 'Five-star turnovers', highlights: ['Between-guest cleans', 'Linen change', 'Photo check-list'], menu: [
    { name: 'Turnover clean (1-bedroom)', price: 2500 }, { name: 'Turnover clean (2-bedroom)', price: 3500 },
    { name: 'Linen wash & restock', price: 1500 }, { name: 'Deep clean between bookings', price: 5000 }, { name: 'Guest-ready inspection', price: 1000 } ] },
  dog_walking: { headline: 'Happy walks, happy dogs', highlights: ['Pet-loving walkers', 'GPS photo updates', 'All sizes'], menu: [
    { name: '30-minute walk', price: 500 }, { name: '1-hour walk & play', price: 800 },
    { name: 'Weekly walks (5 days)', price: 3500, unit: 'per week' }, { name: 'Pet sitting (half day)', price: 1500 }, { name: 'Dog bath & brush', price: 1200 } ] },
  elder_care: { headline: 'Gentle care for loved ones', highlights: ['Trained caregivers', 'Companionship', 'Medication reminders'], menu: [
    { name: 'Day companion (8 hrs)', price: 2500, unit: 'per day' }, { name: 'Overnight care', price: 3000, unit: 'per night' },
    { name: 'Hospital visit escort', price: 1800 }, { name: 'Weekly care plan (5 days)', price: 11000, unit: 'per week' }, { name: 'Mobility & exercise support', price: 1500 } ] },
  moms_helper: { headline: 'An extra pair of hands', highlights: ['Experienced nannies', 'Homework help', 'First-aid aware'], menu: [
    { name: 'Babysitting (4 hrs)', price: 1500 }, { name: 'Full-day nanny', price: 2500, unit: 'per day' },
    { name: 'Evening sitter (6 pm - 11 pm)', price: 1800 }, { name: 'School pick-up & homework', price: 1200 }, { name: 'Newborn helper (day)', price: 3000, unit: 'per day' } ] },
  driver: { headline: 'Your car, our driver', highlights: ['Experienced drivers', 'Airport runs', 'Half or full day'], menu: [
    { name: 'Half-day driver (4 hrs)', price: 2500 }, { name: 'Full-day driver (9 hrs)', price: 4000 },
    { name: 'Airport drop / pick-up', price: 1500 }, { name: 'School runs (weekly)', price: 6000, unit: 'per week' }, { name: 'Upcountry trip driver', price: 6000, unit: 'per day' } ] },
  gas: { headline: 'Gas delivered & fitted safely', highlights: ['All cylinder brands', 'Leak check included', 'Fast delivery'], menu: [
    { name: '6 kg refill delivery', price: 1400 }, { name: '13 kg refill delivery', price: 3200 },
    { name: 'Regulator & hose replacement', price: 1500 }, { name: 'Gas cooker installation', price: 2000 }, { name: 'Leak test & safety check', price: 1000 } ] },
  internet_installation: { headline: 'Fast Wi-Fi in every room', highlights: ['Router setup', 'Mesh & extenders', 'Cabling done neat'], menu: [
    { name: 'Router setup & optimisation', price: 1500 }, { name: 'Mesh Wi-Fi install (3 nodes)', price: 4500 },
    { name: 'Ethernet cabling (per point)', price: 1800 }, { name: 'Smart TV & devices setup', price: 1200 }, { name: 'Home office network', price: 3500 } ] },
  makeup_professional: { headline: 'Glam that lasts all day', highlights: ['Bridal & events', 'Home visits', 'Premium products'], menu: [
    { name: 'Everyday soft glam', price: 2500 }, { name: 'Bridal make-up & trial', price: 15000 },
    { name: 'Event / party glam', price: 4000 }, { name: 'Bridesmaid make-up', price: 3000, unit: 'per person' }, { name: 'Lashes & brows', price: 1500 } ] },
};

const MALE_FIRST = ['John', 'David', 'Peter', 'Kevin', 'Samuel', 'James', 'Francis', 'George', 'Brian', 'Patrick', 'Daniel', 'Joseph', 'Victor', 'Dennis'];
const FEMALE_FIRST = ['Sarah', 'Grace', 'Mary', 'Faith', 'Lucy', 'Beatrice', 'Alice', 'Mercy', 'Jane', 'Esther', 'Catherine', 'Lydia', 'Purity', 'Joy'];
const SURNAMES = ['Kamau', 'Otieno', 'Wambui', 'Njeri', 'Achieng', 'Mutua', 'Kipkorir', 'Wanjiku', 'Onyango', 'Nekesa', 'Maina', 'Atieno', 'Kariuki', 'Chepngetich', 'Odhiambo', 'Mumbua', 'Githinji', 'Zawadi', 'Barasa', 'Moraa'];

const MALE_PHOTOS = [
  'photo-1507003211169-0a1dd7228f2d', 'photo-1560250097-0b93528c311a', 'photo-1519085360753-af0119f7cbe7',
  'photo-1500648767791-00dcc994a43e', 'photo-1472099645785-5658abf4ff4e', 'photo-1506794778202-cad84cf45f1d',
  'photo-1501196354995-cbb51c65aaea', 'photo-1531384441138-2736e62e0919', 'photo-1522529599102-193c0d76b5b6',
  'photo-1539571696357-5a69c17a67c6', 'photo-1527980965255-d3b416303d12', 'photo-1506803682981-6e718a9dd3ee',
];
const FEMALE_PHOTOS = [
  'photo-1531123897727-8f129e1688ce', 'photo-1573496359142-b8d87734a5a2', 'photo-1580489944761-15a19d654956',
  'photo-1567532939604-b6b5b0db2604', 'photo-1494790108377-be9c29b29330', 'photo-1534528741775-53994a69daeb',
  'photo-1544005313-94ddf0286df2', 'photo-1523824921871-d6f1a15151f1', 'photo-1508214751196-bcfd4ca60f91',
  'photo-1554151228-14d9def656e4', 'photo-1548142813-c348350df52b', 'photo-1563132337-f159f484226c',
];
const photoUrl = (id: string) => `https://images.unsplash.com/${id}?q=80&w=400&h=400&auto=format&fit=crop`;

const AREAS = ['Kilimani', 'Westlands', 'Kileleshwa', 'Lavington', 'Karen', 'South C', 'Parklands', 'Roysambu', 'Lang’ata', 'Ruaka', 'Kasarani', 'Syokimau'];
const TAGLINES = ['Reliable, on time, every time', 'Premium care for busy homes', 'Friendly, fast and fairly priced'];
// Each of a service's three providers prices a little differently.
const PRICE_FACTORS = [1, 1.15, 0.9];

const roundTo50 = (n: number) => Math.round(n / 50) * 50;

function buildProviders(service: ServiceItem, serviceIndex: number): SampleProvider[] {
  const show = SHOWCASE[service.id];
  if (!show) return [];
  return [0, 1, 2].map((slot) => {
    const n = serviceIndex * 3 + slot;
    const female = (serviceIndex + slot) % 2 === 0;
    const first = (female ? FEMALE_FIRST : MALE_FIRST)[n % 14];
    const last = SURNAMES[(n * 7) % SURNAMES.length];
    const photos = female ? FEMALE_PHOTOS : MALE_PHOTOS;
    // Pick 4 of the 5 menu items, a different one left out for each provider.
    const premium = show.menu
      .filter((_, i) => i !== (slot + 2) % show.menu.length)
      .slice(0, 4)
      .map((m) => ({ ...m, price: roundTo50(m.price * PRICE_FACTORS[slot]) }));
    return {
      id: `${service.id}-${slot + 1}`,
      serviceId: service.id,
      name: `${first} ${last}`,
      photo: photoUrl(photos[n % photos.length]),
      tagline: TAGLINES[slot],
      yearsExperience: 3 + ((n * 5) % 9),
      rating: Math.round((4.6 + ((n * 3) % 5) / 12.5) * 10) / 10,
      jobsDone: 40 + ((n * 37) % 260),
      area: AREAS[n % AREAS.length],
      highlights: show.highlights,
      premium,
    };
  });
}

export const SAMPLE_PROVIDERS: Record<string, SampleProvider[]> = Object.fromEntries(
  PROVIDER_LIST_SERVICES.map((s, i) => [s.id, buildProviders(s, i)]),
);

export function posterHeadline(serviceId: string): string {
  return SHOWCASE[serviceId]?.headline || '';
}

export function formatKes(n: number): string {
  return `KES ${n.toLocaleString('en-KE')}`;
}

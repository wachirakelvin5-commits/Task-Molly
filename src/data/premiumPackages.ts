// task-molly Premium: one monthly package per service, shown on the task-molly providers page
// (/premium, opened from the pen icon). Each package lists what's included and the monthly
// charge for each part. Prices are in KES per month. Review them before they go live.
import { PROVIDER_LIST_SERVICES, ServiceItem } from './serviceCatalog';

export interface PremiumItem {
  name: string;
  monthly: number; // KES per month
}

export interface PremiumPackage {
  service: ServiceItem;
  title: string;      // e.g. "Mama Fua Care Premium"
  headline: string;   // poster headline
  tagline: string;    // one line under the title
  highlights: string[];
  items: PremiumItem[];
}

const PACKAGES: Record<string, Omit<PremiumPackage, 'service' | 'title'>> = {
  errand_runner: { headline: 'Your to-do list, done every month', tagline: 'A dedicated runner for bills, queues and pick-ups.', highlights: ['Same-day runs', 'Receipts sent', 'Dedicated runner'], items: [
    { name: 'Weekly errand run (up to 4 stops)', monthly: 5500 }, { name: 'Monthly bill payments & queueing', monthly: 2500 },
    { name: 'Parcel pick-ups & drop-offs (up to 6)', monthly: 3000 }, { name: 'Office & document filing (2 visits)', monthly: 2200 } ] },
  shopping: { headline: 'Shopping without the traffic', tagline: 'A personal shopper who knows your list.', highlights: ['Photo of every item', 'Price-checked', 'Delivered to your door'], items: [
    { name: 'Weekly personal shopping trip', monthly: 4400 }, { name: 'Household restock (2 trips)', monthly: 1900 },
    { name: 'Returns & exchanges handled', monthly: 1200 }, { name: 'Gift shopping & wrapping (1 occasion)', monthly: 1500 } ] },
  grocery_shopping: { headline: 'Fresh groceries, on schedule', tagline: 'Your weekly list, picked fresh and delivered.', highlights: ['Market-fresh produce', 'Substitutions checked with you', 'Cold items kept cold'], items: [
    { name: 'Weekly supermarket shop (up to 25 items)', monthly: 3200 }, { name: 'Fortnightly market produce run', monthly: 2200 },
    { name: 'Butcher & fishmonger pick-ups (2)', monthly: 1300 }, { name: 'Pantry check & restock list', monthly: 800 } ] },
  mama_fua: { headline: 'Clean clothes, zero stress', tagline: 'A trusted mama fua at your door every week.', highlights: ['Hand wash & machine wash', 'Folded & sorted', 'Gentle on fabrics'], items: [
    { name: 'Weekly wash & fold (up to 30 items)', monthly: 4800 }, { name: 'Bedding & towels (fortnightly)', monthly: 2400 },
    { name: 'Ironing add-on (weekly)', monthly: 2000 }, { name: 'Curtains & rugs (monthly)', monthly: 1500 } ] },
  carpet_sofa_cleaning: { headline: 'Sofas that stay like new', tagline: 'Regular deep cleans for upholstery and carpets.', highlights: ['Deep extraction clean', 'Stain treatment', 'Fast drying'], items: [
    { name: 'Sofa refresh (5-seater, monthly)', monthly: 3000 }, { name: 'Carpet & rug clean (monthly)', monthly: 1800 },
    { name: 'Mattress sanitising (quarterly, spread monthly)', monthly: 800 }, { name: 'Spot-stain call-out (1 included)', monthly: 1000 } ] },
  laundry_ironing: { headline: 'Crisp, pressed, ready', tagline: 'Pick-up, wash, press and return every week.', highlights: ['Pick-up & delivery', 'Steam ironing', 'Shirts on hangers'], items: [
    { name: 'Weekly wash & iron (up to 5 kg)', monthly: 3400 }, { name: 'Weekly ironing (up to 20 pieces)', monthly: 2600 },
    { name: 'Suits & delicates (4 pieces)', monthly: 1800 }, { name: 'Free pick-up & delivery', monthly: 0 } ] },
  indoor_cleaning: { headline: 'A spotless home, every week', tagline: 'Vetted cleaners on a regular schedule.', highlights: ['Kitchen & bathrooms', 'Eco products', 'Same cleaner each visit'], items: [
    { name: 'Weekly standard clean (2-bedroom)', monthly: 9000 }, { name: 'Monthly deep clean', monthly: 4500 },
    { name: 'Kitchen degrease (monthly)', monthly: 1800 }, { name: 'Inside windows (monthly)', monthly: 1200 } ] },
  cook_meal: { headline: 'Home-cooked, done for you', tagline: 'Weekly meal prep in your kitchen.', highlights: ['Kenyan & continental', 'Meal-prep for the week', 'Clean kitchen after'], items: [
    { name: 'Weekly meal prep (5 days, family of 4)', monthly: 16000 }, { name: 'Monthly menu planning', monthly: 1500 },
    { name: 'Weekend baking session (1)', monthly: 2500 }, { name: 'Grocery list & shopping coordination', monthly: 1000 } ] },
  plumbing_repairs: { headline: 'Leaks fixed before they start', tagline: 'A plumber on call for your home.', highlights: ['Priority call-outs', 'Clean workmanship', '30-day guarantee'], items: [
    { name: 'Monthly plumbing check-up', monthly: 1500 }, { name: 'Priority call-out (1 included)', monthly: 1500 },
    { name: 'Water tank cleaning (twice a year, spread monthly)', monthly: 700 }, { name: 'Drain & toilet unblocking (as needed)', monthly: 1000 } ] },
  electrical_solar: { headline: 'Safe power, all month', tagline: 'Certified electricians looking after your home.', highlights: ['Certified electricians', 'Fault-finding', 'Neat wiring'], items: [
    { name: 'Monthly safety inspection', monthly: 1800 }, { name: 'Priority fault call-out (1 included)', monthly: 1800 },
    { name: 'Bulbs & sockets replacement labour', monthly: 800 }, { name: 'Solar backup check (quarterly, spread monthly)', monthly: 1000 } ] },
  fundi_handyman: { headline: 'Small fixes, every month', tagline: 'A handyman visit for the little jobs that pile up.', highlights: ['Bring the tools', 'Doors, shelves, curtains', 'Same-week visits'], items: [
    { name: 'Monthly handyman visit (3 hours)', monthly: 3200 }, { name: 'Door, lock & hinge tune-up', monthly: 800 },
    { name: 'Shelf, mirror & curtain fixes', monthly: 900 }, { name: 'Priority call-out (1 included)', monthly: 1200 } ] },
  carpenter: { headline: 'Woodwork kept in shape', tagline: 'Regular care for cabinets, doors and furniture.', highlights: ['Repairs & refinishing', 'Quality timber', 'Furniture assembly'], items: [
    { name: 'Monthly carpentry visit (2 hours)', monthly: 2800 }, { name: 'Cabinet & door adjustments', monthly: 900 },
    { name: 'Furniture assembly (1 piece)', monthly: 1500 }, { name: 'Wood polishing & touch-ups', monthly: 1000 } ] },
  appliance_repair: { headline: 'Appliances that keep running', tagline: 'Servicing that prevents breakdowns.', highlights: ['Fridges, washers, cookers', 'Genuine spares', 'Diagnosis included'], items: [
    { name: 'Monthly appliance check (up to 4)', monthly: 1800 }, { name: 'Washing machine service (quarterly, spread monthly)', monthly: 900 },
    { name: 'Fridge & freezer service (twice a year, spread monthly)', monthly: 800 }, { name: 'Priority repair call-out (1 included)', monthly: 1500 } ] },
  tv_mounting: { headline: 'Screens set up and sorted', tagline: 'Your TVs, sound and decoders, always working.', highlights: ['All TV sizes', 'Cable management', 'Devices set up'], items: [
    { name: 'Home entertainment check-up', monthly: 1000 }, { name: 'Mounting or re-mounting (1 TV)', monthly: 1800 },
    { name: 'Decoder, soundbar & streaming setup', monthly: 900 }, { name: 'Cable tidy & trunking touch-ups', monthly: 700 } ] },
  movers_relocation: { headline: 'Moves made easy, any time', tagline: 'For homes and offices that move things often.', highlights: ['Packing & wrapping', 'Careful crew', 'Truck when needed'], items: [
    { name: 'Monthly small move (up to 10 items)', monthly: 4500 }, { name: 'Furniture rearranging crew (3 hours)', monthly: 2500 },
    { name: 'Packing materials included', monthly: 800 }, { name: 'Storage drop-off & pick-up (1 trip)', monthly: 1800 } ] },
  pest_control: { headline: 'Pests out, all year', tagline: 'Regular treatments that keep pests away.', highlights: ['Child & pet-safe options', 'Follow-up visits', 'Certified chemicals'], items: [
    { name: 'Monthly preventive spray (2-bedroom)', monthly: 2500 }, { name: 'Cockroach & ant gel top-up', monthly: 1000 },
    { name: 'Rodent bait stations', monthly: 900 }, { name: 'Emergency treatment (1 included)', monthly: 1500 } ] },
  gardening_landscaping: { headline: 'A compound you’ll love', tagline: 'A gardener who keeps it neat every week.', highlights: ['Lawn care', 'Hedges & flowers', 'Weekly visits'], items: [
    { name: 'Weekly lawn mowing & edging', monthly: 5000 }, { name: 'Hedge trimming (fortnightly)', monthly: 2400 },
    { name: 'Flower bed care & watering', monthly: 1800 }, { name: 'Compound clean-up & waste removal', monthly: 1500 } ] },
  security_cctv: { headline: 'See your home from anywhere', tagline: 'Cameras and alarms checked and working.', highlights: ['HD cameras', 'Phone viewing', 'Remote support'], items: [
    { name: 'Monthly CCTV health check', monthly: 1800 }, { name: 'Remote viewing support', monthly: 800 },
    { name: 'Electric fence & alarm check', monthly: 1500 }, { name: 'Priority repair call-out (1 included)', monthly: 1500 } ] },
  house_painting: { headline: 'Walls that stay fresh', tagline: 'Touch-ups before marks become repaints.', highlights: ['Clean edges', 'Furniture covered', 'Matched colours'], items: [
    { name: 'Monthly touch-up visit (3 hours)', monthly: 3000 }, { name: 'Paint & materials for touch-ups', monthly: 1200 },
    { name: 'Gate & grill rust care (quarterly, spread monthly)', monthly: 1000 }, { name: 'Crack & skim repairs', monthly: 1000 } ] },
  airbnb_cleaning: { headline: 'Five-star turnovers', tagline: 'Every guest walks into a spotless stay.', highlights: ['Between-guest cleans', 'Linen change', 'Photo check-list'], items: [
    { name: 'Turnover cleans (up to 8, 1-bedroom)', monthly: 18000 }, { name: 'Linen wash & restock', monthly: 4500 },
    { name: 'Monthly deep clean', monthly: 4500 }, { name: 'Guest-ready inspection & photos', monthly: 2000 } ] },
  dog_walking: { headline: 'Happy walks, happy dogs', tagline: 'Daily walks with photo updates.', highlights: ['Pet-loving walkers', 'Photo updates', 'All sizes'], items: [
    { name: 'Weekday walks (30 min, 5 days a week)', monthly: 9000 }, { name: 'Weekend play session (4)', monthly: 3200 },
    { name: 'Monthly bath & brush', monthly: 1200 }, { name: 'Pet sitting (1 half day)', monthly: 1500 } ] },
  elder_care: { headline: 'Gentle care for loved ones', tagline: 'Trained caregivers you can rely on.', highlights: ['Trained caregivers', 'Companionship', 'Medication reminders'], items: [
    { name: 'Weekday day companion (8 hrs, 5 days)', monthly: 45000 }, { name: 'Hospital visit escorts (2)', monthly: 3500 },
    { name: 'Weekly exercise & mobility support', monthly: 5500 }, { name: 'Family update report', monthly: 0 } ] },
  moms_helper: { headline: 'An extra pair of hands', tagline: 'Reliable help with the little ones.', highlights: ['Experienced nannies', 'Homework help', 'First-aid aware'], items: [
    { name: 'Babysitting (2 evenings a week)', monthly: 12000 }, { name: 'School pick-ups & homework (weekdays)', monthly: 18000 },
    { name: 'Weekend half-day sitter (2)', monthly: 3000 }, { name: 'Back-up sitter when yours is off', monthly: 2000 } ] },
  driver: { headline: 'Your car, our driver', tagline: 'A dependable driver on your schedule.', highlights: ['Experienced drivers', 'Airport runs', 'School runs'], items: [
    { name: 'Weekday school runs', monthly: 22000 }, { name: 'Airport drop / pick-up (2)', monthly: 3000 },
    { name: 'Weekend errands driver (2 half days)', monthly: 5000 }, { name: 'Car wash & fuel top-up runs', monthly: 1500 } ] },
  gas: { headline: 'Never run out of gas', tagline: 'Refills delivered and fitted safely.', highlights: ['All cylinder brands', 'Leak check included', 'Fast delivery'], items: [
    { name: '13 kg refill delivery (1 a month, gas charged at cost)', monthly: 500 }, { name: 'Monthly leak test & safety check', monthly: 800 },
    { name: 'Regulator & hose care', monthly: 500 }, { name: 'Priority same-day delivery', monthly: 600 } ] },
  internet_installation: { headline: 'Fast Wi-Fi in every room', tagline: 'Your home network set up and looked after.', highlights: ['Router setup', 'Mesh & extenders', 'Remote support'], items: [
    { name: 'Monthly Wi-Fi health check', monthly: 1200 }, { name: 'Remote support (unlimited)', monthly: 1000 },
    { name: 'New device setup (up to 3)', monthly: 900 }, { name: 'Priority call-out (1 included)', monthly: 1500 } ] },
  makeup_professional: { headline: 'Glam that lasts all day', tagline: 'Your make-up artist on call.', highlights: ['Events & everyday', 'Home visits', 'Premium products'], items: [
    { name: 'Soft glam sessions (2)', monthly: 4500 }, { name: 'Event glam (1)', monthly: 3500 },
    { name: 'Lashes & brows (monthly)', monthly: 1500 }, { name: 'Skin prep & consultation', monthly: 1000 } ] },
};

export const PREMIUM_PACKAGES: PremiumPackage[] = PROVIDER_LIST_SERVICES
  .filter((s) => PACKAGES[s.id])
  .map((service) => ({ service, title: `${service.name} Premium`, ...PACKAGES[service.id] }));

export function packageTotal(p: PremiumPackage): number {
  return p.items.reduce((t, i) => t + i.monthly, 0);
}

export function formatKes(n: number): string {
  return n === 0 ? 'Included' : `KES ${n.toLocaleString('en-KE')}`;
}

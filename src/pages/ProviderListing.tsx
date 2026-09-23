import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Star, MapPin, DollarSign, PhoneCall, MessageSquare } from 'lucide-react';
import { useDeviceType } from '../hooks/useDeviceType';

interface Provider {
  id: string;
  name: string;
  service: string;
  rating: number;
  reviews: number;
  distance: number;
  priceLevel: number;
  photo: string;
}

const SERVICES_LIST = [
  'Mama Fua', 'Fundi', 'Electrician', 'Plumber', 'Home Cleaning', 'Appliance Repair',
  'Painter', 'Moving Help', 'Gardener', 'Carpenter', 'Security Technician', 'Pest Control',
  'Gas Technician', 'Water Tank Cleaning', 'Internet & TV Installation', 'Phone & Laptop Repair',
  'Car Wash (Home Service)', 'Errand Runner', 'Personal Assistant', 'Babysitting & Child Care',
  'Cook / Meal Prep', 'Event Help', 'Interior Stylist', 'Waste Collection'
];

const MALE_NAMES = [
  'John Kamau', 'David Otieno', 'Peter Mwangi', 'Kevin Kipkorir', 'Samuel Juma',
  'James Onyango', 'Francis Maina', 'George Kariuki', 'Robert Odhiambo', 'Patrick Githinji',
  'Daniel Barasa', 'Joseph Kibet'
];

const FEMALE_NAMES = [
  'Sarah Wambui', 'Grace Njeri', 'Mary Achieng', 'Faith Mutua', 'Lucy Wanjiku',
  'Beatrice Nekesa', 'Alice Atieno', 'Mercy Chepngetich', 'Jane Mumbua', 'Esther Zawadi',
  'Catherine Kwamboka', 'Lydia Moraa'
];

const MALE_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531384441138-2736e62e0919?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?q=80&w=400&h=400&auto=format&fit=crop'
];

const FEMALE_PHOTOS = [
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=400&h=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1563132337-f159f484226c?q=80&w=400&h=400&auto=format&fit=crop'
];

const generateProviders = (): Provider[] => {
  const providers: Provider[] = [];
  let idCounter = 1;

  SERVICES_LIST.forEach(service => {
    for (let i = 0; i < 10; i++) {
      const isMale = Math.random() > 0.5;
      const nameList = isMale ? MALE_NAMES : FEMALE_NAMES;
      const photoList = isMale ? MALE_PHOTOS : FEMALE_PHOTOS;
      
      const nameIndex = Math.floor(Math.random() * nameList.length);
      const photoIndex = Math.floor(Math.random() * photoList.length);
      
      providers.push({
        id: idCounter.toString(),
        name: nameList[nameIndex],
        service: service,
        rating: 4.5 + Math.random() * 0.5,
        reviews: 20 + Math.floor(Math.random() * 150),
        distance: 0.5 + Math.random() * 8,
        priceLevel: 1 + Math.floor(Math.random() * 3),
        photo: photoList[photoIndex]
      });
      idCounter++;
    }
  });

  return providers;
};

const MOCK_PROVIDERS: Provider[] = generateProviders();

export default function ProviderListing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { type: deviceType, isPhone } = useDeviceType();
  const serviceFilter = searchParams.get('service') || '';
  const locationFilter = searchParams.get('location') || '';

  const filteredProviders = MOCK_PROVIDERS.filter(p => {
    if (!serviceFilter) return true;
    // Check if service name matches exactly or is contained
    return p.service.toLowerCase().includes(serviceFilter.toLowerCase()) ||
           serviceFilter.toLowerCase().includes(p.service.toLowerCase());
  });

  // Dynamic Grid Algorithm
  const gridCols = {
    phone: 'grid-cols-1', // Single column for phone to ensure details fit perfectly
    tablet: 'grid-cols-2',
    laptop: 'grid-cols-4'
  }[deviceType];

  return (
    <div className="min-h-[100dvh] pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-light mb-4">
          {serviceFilter ? `${serviceFilter} Pros` : 'All Service Pros'} 
          <span className="text-accent-gold"> near {locationFilter || 'you'}</span>
        </h1>
        <p className="text-rich-black/60">Showing {filteredProviders.length} verified professionals ready to help.</p>
      </div>

      <div className={`grid ${gridCols} gap-6 md:gap-8`}>
        {filteredProviders.map((p, i) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white border border-warm-gray rounded-3xl gold-hover relative group ${
              deviceType === 'phone' ? 'p-4' : 'p-6'
            }`}
          >
            <div className={`flex items-start gap-4 ${deviceType === 'phone' ? 'mb-4' : 'mb-6'}`}>
              <img 
                src={p.photo} 
                alt={p.name} 
                className={`${
                  deviceType === 'phone' ? 'w-12 h-12' : 'w-16 h-16'
                } rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all`}
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <h3 className={`${
                  deviceType === 'phone' ? 'text-lg' : 'text-xl'
                } font-medium mb-1 truncate`}>{p.name}</h3>
                <p className="text-xs text-rich-black/40 uppercase tracking-widest mb-2 truncate">{p.service}</p>
                <div className="flex items-center gap-1 text-accent-gold">
                  <Star size={14} fill="currentColor" />
                  <span className="text-sm font-semibold">{p.rating.toFixed(1)}</span>
                  <span className="text-xs text-rich-black/40 ml-1">({p.reviews})</span>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between py-3 border-y border-warm-gray/50 ${
              deviceType === 'phone' ? 'mb-4' : 'mb-6'
            }`}>
              <div className="flex items-center gap-2 text-rich-black/60 text-xs md:text-sm">
                <MapPin size={14} />
                <span>{p.distance.toFixed(1)} km away</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <DollarSign 
                    key={i} 
                    size={12} 
                    className={i < p.priceLevel ? 'text-rich-black' : 'text-rich-black/20'} 
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 md:gap-3">
              <button 
                onClick={() => navigate(`/chat/new?provider=${p.id}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-rich-black text-white py-2.5 md:py-3 rounded-full hover:bg-rich-black/90 transition-colors"
              >
                <MessageSquare size={16} />
                <span className="text-xs md:text-sm font-medium">Message</span>
              </button>
              <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border border-warm-gray rounded-full hover:border-accent-gold text-accent-gold transition-colors">
                <PhoneCall size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

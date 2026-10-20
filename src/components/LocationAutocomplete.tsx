import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, X, Check, Building2, Compass } from 'lucide-react';

export interface LocationSelection {
  fullAddress: string;
  neighborhood: string;
  specificAddress: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (selection: LocationSelection) => void;
  unitOrApartment: string;
  onUnitChange: (unit: string) => void;
  placeholder?: string;
  error?: string;
}

interface PlaceSuggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  neighborhood: string;
  fullAddress: string;
}

// Curated list of Nairobi's prominent estates, landmarks, malls, and streets
const POPULAR_NAIROBI_PLACES: PlaceSuggestion[] = [
  { id: '1', mainText: 'Kilimani', secondaryText: 'Argwings Kodhek / Denis Pritt, Nairobi', neighborhood: 'Kilimani', fullAddress: 'Kilimani, Nairobi' },
  { id: '2', mainText: 'Westlands', secondaryText: 'Waiyaki Way / Mpaka Road, Nairobi', neighborhood: 'Westlands', fullAddress: 'Westlands, Nairobi' },
  { id: '3', mainText: 'Kileleshwa', secondaryText: 'Kandara Road / Oloitokitok Rd, Nairobi', neighborhood: 'Kileleshwa', fullAddress: 'Kileleshwa, Nairobi' },
  { id: '4', mainText: 'Lavington', secondaryText: 'James Gichuru / Muthangari, Nairobi', neighborhood: 'Lavington', fullAddress: 'Lavington, Nairobi' },
  { id: '5', mainText: 'Karen', secondaryText: 'Ngong Road / Karen Cross, Nairobi', neighborhood: 'Karen', fullAddress: 'Karen, Nairobi' },
  { id: '6', mainText: 'Nairobi CBD', secondaryText: 'Kenyatta Ave / Moi Ave, Central Nairobi', neighborhood: 'CBD', fullAddress: 'Central Business District, Nairobi' },
  { id: '7', mainText: 'Sarit Centre', secondaryText: 'Karuna Road, Westlands, Nairobi', neighborhood: 'Westlands', fullAddress: 'Sarit Centre, Karuna Rd, Westlands, Nairobi' },
  { id: '8', mainText: 'Yaya Centre', secondaryText: 'Argwings Kodhek Rd, Kilimani, Nairobi', neighborhood: 'Kilimani', fullAddress: 'Yaya Centre, Argwings Kodhek Rd, Kilimani, Nairobi' },
  { id: '9', mainText: 'The Hub Karen', secondaryText: 'Dagoretti Road, Karen, Nairobi', neighborhood: 'Karen', fullAddress: 'The Hub, Dagoretti Rd, Karen, Nairobi' },
  { id: '10', mainText: 'Two Rivers Mall', secondaryText: 'Limuru Road, Ruaka / Runda Border, Nairobi', neighborhood: 'Runda', fullAddress: 'Two Rivers Mall, Limuru Rd, Nairobi' },
  { id: '11', mainText: 'South B', secondaryText: 'Mombasa Road / Plainsview, Nairobi', neighborhood: 'South B', fullAddress: 'South B, Nairobi' },
  { id: '12', mainText: 'South C', secondaryText: 'Muhoho Ave / Bellevue, Nairobi', neighborhood: 'South C', fullAddress: 'South C, Nairobi' },
  { id: '13', mainText: 'Parklands', secondaryText: '3rd Parklands / Limuru Rd, Nairobi', neighborhood: 'Parklands', fullAddress: 'Parklands, Nairobi' },
  { id: '14', mainText: 'Roysambu', secondaryText: 'TRM Drive / Lumumba Drive, Thika Road', neighborhood: 'Roysambu', fullAddress: 'Roysambu, Thika Rd, Nairobi' },
  { id: '15', mainText: 'Runda', secondaryText: 'Runda Drive / Pan Africa Insurance, Nairobi', neighborhood: 'Runda', fullAddress: 'Runda Estate, Nairobi' },
  { id: '16', mainText: 'Riverside Drive', secondaryText: 'Riverside / Chiromo Road, Westlands, Nairobi', neighborhood: 'Riverside', fullAddress: 'Riverside Drive, Nairobi' },
  { id: '17', mainText: 'Garden City Mall', secondaryText: 'Thika Superhighway, Roysambu / Kasarani', neighborhood: 'Thika Road', fullAddress: 'Garden City Mall, Thika Rd, Nairobi' },
  { id: '18', mainText: 'Upper Hill', secondaryText: 'Hospital Road / Mara Road, Nairobi', neighborhood: 'Upper Hill', fullAddress: 'Upper Hill, Nairobi' },
  { id: '19', mainText: 'Langata', secondaryText: 'Langata Road / Dam Estate, Nairobi', neighborhood: 'Langata', fullAddress: 'Langata, Nairobi' },
  { id: '20', mainText: 'Syokimau', secondaryText: 'Katani Road / Mombasa Road, Nairobi Metro', neighborhood: 'Syokimau', fullAddress: 'Syokimau, Mombasa Rd, Nairobi' },
  { id: '21', mainText: 'Ngong Road', secondaryText: 'Junction Mall / Adams Arcade, Nairobi', neighborhood: 'Ngong Road', fullAddress: 'Ngong Road, Nairobi' },
  { id: '22', mainText: 'Gigiri', secondaryText: 'UN Avenue / Village Market, Nairobi', neighborhood: 'Gigiri', fullAddress: 'Gigiri, UN Avenue, Nairobi' },
  { id: '23', mainText: 'Muthaiga', secondaryText: 'Muthaiga Road / Gertrude\'s, Nairobi', neighborhood: 'Muthaiga', fullAddress: 'Muthaiga, Nairobi' },
  { id: '24', mainText: 'Pangani', secondaryText: 'Murang\'a Road / Juja Road, Nairobi', neighborhood: 'Pangani', fullAddress: 'Pangani, Nairobi' },
  { id: '25', mainText: 'Kasarani', secondaryText: 'Mwiki Road / Sportsview, Nairobi', neighborhood: 'Kasarani', fullAddress: 'Kasarani, Nairobi' },
  { id: '26', mainText: 'Madaraka', secondaryText: 'Strathmore / Ole Sangale Rd, Nairobi', neighborhood: 'Madaraka', fullAddress: 'Madaraka Estate, Nairobi' }
];

export default function LocationAutocomplete({
  value,
  onChange,
  unitOrApartment,
  onUnitChange,
  placeholder = 'Search address, estate, building, or road in Nairobi...',
  error
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal input value if prop changes externally
  useEffect(() => {
    if (value && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter local & remote suggestions
  const searchPlaces = (query: string) => {
    const trimmed = query.trim().toLowerCase();

    // 1. Local instant suggestions
    const localMatches = trimmed
      ? POPULAR_NAIROBI_PLACES.filter(p => 
          p.mainText.toLowerCase().includes(trimmed) || 
          p.secondaryText.toLowerCase().includes(trimmed) ||
          p.neighborhood.toLowerCase().includes(trimmed)
        )
      : POPULAR_NAIROBI_PLACES.slice(0, 7);

    setSuggestions(localMatches);

    // 2. If user typed 3+ chars, query live Photon geocoding API for exact Nairobi addresses
    if (trimmed.length >= 3) {
      setIsLoading(true);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' Nairobi Kenya')}&lat=-1.286389&lon=36.817223&limit=6`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const liveSuggestions: PlaceSuggestion[] = data.features.map((f: any, idx: number) => {
                const props = f.properties || {};
                const name = props.name || props.street || query;
                const district = props.district || props.suburb || props.city || 'Nairobi';
                const street = props.street ? `${props.street}, ` : '';
                const secondary = `${street}${district}, Nairobi`;
                return {
                  id: `live-${idx}-${name}`,
                  mainText: name,
                  secondaryText: secondary,
                  neighborhood: district,
                  fullAddress: `${name}, ${secondary}`
                };
              });

              // Combine unique items
              setSuggestions(prev => {
                const existingNames = new Set(prev.map(p => p.mainText.toLowerCase()));
                const newAdditions = liveSuggestions.filter(s => !existingNames.has(s.mainText.toLowerCase()));
                return [...prev, ...newAdditions].slice(0, 10);
              });
            }
          }
        } catch {
          // Graceful fallback to rich local list
        } finally {
          setIsLoading(false);
        }
      }, 250);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    setIsOpen(true);
    searchPlaces(text);

    // Update parent with custom input as fallback
    onChange({
      fullAddress: text,
      neighborhood: 'Nairobi Area',
      specificAddress: text
    });
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setInputValue(place.fullAddress);
    setIsOpen(false);
    onChange({
      fullAddress: place.fullAddress,
      neighborhood: place.neighborhood,
      specificAddress: place.mainText
    });
  };

  const handleClear = () => {
    setInputValue('');
    onChange({
      fullAddress: '',
      neighborhood: '',
      specificAddress: ''
    });
    setSuggestions(POPULAR_NAIROBI_PLACES.slice(0, 7));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode via Photon
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            const feat = data.features?.[0]?.properties;
            if (feat) {
              const name = feat.name || feat.street || 'Current Location';
              const district = feat.district || feat.suburb || feat.city || 'Nairobi';
              const address = `${name}, ${district}, Nairobi`;
              setInputValue(address);
              onChange({
                fullAddress: address,
                neighborhood: district,
                specificAddress: name
              });
              setIsOpen(false);
              return;
            }
          }
          // Default fallback
          const fallback = 'Current Location, Nairobi, Kenya';
          setInputValue(fallback);
          onChange({
            fullAddress: fallback,
            neighborhood: 'Nairobi',
            specificAddress: 'Current GPS Location'
          });
          setIsOpen(false);
        } catch {
          const fallback = 'Current Location, Nairobi, Kenya';
          setInputValue(fallback);
          onChange({
            fullAddress: fallback,
            neighborhood: 'Nairobi',
            specificAddress: 'Current GPS Location'
          });
          setIsOpen(false);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full space-y-2">
      {/* Uber-like location search bar */}
      <div className="relative flex items-center">
        {/* Left pin / search indicator */}
        <div className="absolute left-3.5 flex items-center pointer-events-none text-accent-gold">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          ) : (
            <MapPin size={18} className="text-accent-gold" />
          )}
        </div>

        {/* Location input with Uber style */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (suggestions.length === 0) searchPlaces(inputValue);
          }}
          placeholder={placeholder}
          required
          autoComplete="off"
          className="w-full pl-10 pr-20 py-3 bg-primary-bg/50 border border-warm-gray rounded-2xl text-xs sm:text-sm text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 transition-all font-medium shadow-2xs"
        />

        {/* Right action buttons: Clear or GPS */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-rich-black/40 hover:text-rich-black hover:bg-neutral-200/70 transition-colors"
              title="Clear location"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            title="Use current GPS location"
            className="p-1.5 rounded-xl bg-neutral-100 hover:bg-accent-gold/15 text-rich-black/70 hover:text-accent-gold transition-colors flex items-center gap-1 text-[11px] font-bold"
          >
            {isLocating ? (
              <div className="w-3.5 h-3.5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation size={13} className="text-accent-gold" />
            )}
            <span className="hidden sm:inline">GPS</span>
          </button>
        </div>
      </div>

      {/* Uber-like dropdown suggestions popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-warm-gray/90 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
          
          {/* Quick "Use current location" button inside dropdown */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors border-b border-warm-gray/50 text-left text-rich-black cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 group-hover:bg-accent-gold/20 transition-colors">
              <Compass size={16} className="text-accent-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-rich-black group-hover:text-accent-gold transition-colors">
                Use Current Location
              </div>
              <div className="text-[10px] sm:text-xs text-rich-black/50">
                Detect location using phone or device GPS
              </div>
            </div>
          </button>

          {/* List of matching Nairobi addresses & hubs */}
          <div className="py-1">
            <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rich-black/40">
              {inputValue ? 'Matching Places & Addresses' : 'Popular Nairobi Estates & Hubs'}
            </div>

            {suggestions.map((place) => {
              const isSelected = inputValue === place.fullAddress;
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-accent-gold/10' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-accent-gold text-white' : 'bg-neutral-100 text-rich-black/60'
                  }`}>
                    <Building2 size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-rich-black truncate">
                      {place.mainText}
                    </div>
                    <div className="text-[10px] sm:text-xs text-rich-black/50 truncate">
                      {place.secondaryText}
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-accent-gold shrink-0" />}
                </button>
              );
            })}

            {suggestions.length === 0 && (
              <div className="px-4 py-4 text-center text-xs text-rich-black/50">
                No matching places found. You can keep typing your custom street address.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apartment / House / Floor / Unit Number (Uber-style address completion) */}
      <div className="pt-1">
        <label className="block text-[10px] font-bold text-rich-black/60 uppercase mb-1">
          Apartment, House No., Court, or Gate Details (Optional)
        </label>
        <input
          type="text"
          value={unitOrApartment}
          onChange={(e) => onUnitChange(e.target.value)}
          placeholder="e.g. Block B, Apt 4B, Greenwood Court, Gate 3"
          className="w-full p-2.5 bg-primary-bg/40 border border-warm-gray rounded-xl text-xs sm:text-sm text-rich-black placeholder:text-rich-black/40 focus:outline-none focus:border-accent-gold"
        />
      </div>

      {error && (
        <p className="text-[11px] font-semibold text-red-500">{error}</p>
      )}
    </div>
  );
}

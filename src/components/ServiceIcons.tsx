import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Indoor Cleaning (Vacuum cleaner with wheels, canister, hose and nozzle)
export function IndoorCleaningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Soft Gold / Yellow pastel fill on canister body */}
      <path d="M42 28C42 22.4772 46.4772 18 52 18H58C63.5228 18 68 22.4772 68 28V52C68 57.5228 63.5228 62 58 62H52C46.4772 62 42 57.5228 42 52V28Z" fill="#FDE68A" />
      {/* Outer black stroke */}
      <path d="M42 32C42 24.268 48.268 18 56 18C63.732 18 70 24.268 70 32V50C70 57.732 63.732 64 56 64C48.268 64 42 57.732 42 50V32Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Wheel */}
      <circle cx="56" cy="50" r="7" fill="white" stroke="#18181B" strokeWidth="2.4" />
      <circle cx="56" cy="50" r="2.5" fill="#18181B" />
      {/* Hose curving to floor nozzle */}
      <path d="M50 18C50 13 42 11 32 17C20 24 16 38 15 54L15 62" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Floor nozzle base */}
      <path d="M10 64H30" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M15 63L23 57" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// 2. Outdoor Services (Two stylized triangular pine trees)
export function OutdoorServicesIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel mint / sage green fill on left tree */}
      <path d="M28 16L13 36H23L12 52H44L33 36H43L28 16Z" fill="#A7F3D0" />
      {/* Pastel soft teal fill on right tree */}
      <path d="M54 20L41 38H49L39 52H69L59 38H67L54 20Z" fill="#99F6E4" />
      {/* Left Tree Outline */}
      <path d="M28 16L14 36H24L13 52H43L32 36H42L28 16Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 52V64" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Right Tree Outline */}
      <path d="M54 20L42 38H50L40 52H68L58 38H66L54 20Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M54 52V64" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// 3. Office Cleaning (Two modern office buildings with windows)
export function OfficeCleaningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Soft coral / terracotta fill on the taller right building */}
      <rect x="42" y="16" width="26" height="48" rx="7" fill="#FECDD3" />
      {/* Left building outline */}
      <rect x="14" y="30" width="22" height="34" rx="5" fill="white" stroke="#18181B" strokeWidth="2.4" />
      {/* Right building outline */}
      <rect x="42" y="16" width="26" height="48" rx="7" stroke="#18181B" strokeWidth="2.4" />
      {/* Window dots / rectangles */}
      <circle cx="21" cy="40" r="1.8" fill="#18181B" />
      <circle cx="29" cy="40" r="1.8" fill="#18181B" />
      <circle cx="21" cy="49" r="1.8" fill="#18181B" />
      <circle cx="29" cy="49" r="1.8" fill="#18181B" />
      <circle cx="50" cy="27" r="1.8" fill="#18181B" />
      <circle cx="60" cy="27" r="1.8" fill="#18181B" />
      <circle cx="50" cy="37" r="1.8" fill="#18181B" />
      <circle cx="60" cy="37" r="1.8" fill="#18181B" />
      <circle cx="50" cy="47" r="1.8" fill="#18181B" />
      <circle cx="60" cy="47" r="1.8" fill="#18181B" />
    </svg>
  );
}

// 4. Moving Cleaning (Key with sparkles)
export function MovingCleaningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel teal fill on key */}
      <path d="M52 20C46 18 39 21 37 27L20 44V56H32L38 50L45 52C53 52 61 46 61 37C61 28 57 22 52 20Z" fill="#99F6E4" />
      {/* Key head and shaft outline */}
      <path d="M54 22C46.8 19.5 39 23 36.5 30.2L20 46.7V58H31.3L37.5 51.8L44 54C52.8 54 60 46.8 60 38C60 29.5 56.5 23 54 22Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="52" cy="32" r="3.5" fill="white" stroke="#18181B" strokeWidth="2" />
      {/* Key notch teeth */}
      <path d="M26 58V52H32" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <path d="M24 22L26 17L28 22L33 24L28 26L26 31L24 26L19 24L24 22Z" fill="#F59E0B" />
      <path d="M64 16L65 13L66 16L69 17L66 18L65 21L64 18L61 17L64 16Z" fill="#F59E0B" />
    </svg>
  );
}

// 5. Mom's Helper (Caring hands holding baby silhouette)
export function MomsHelperIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel pink fill on cupped hands */}
      <path d="M16 42C16 54 26 64 36 64C40 64 42 61 42 56C38 54 24 50 22 42H16Z" fill="#FBCFE8" />
      <path d="M64 42C64 54 54 64 44 64C40 64 38 61 38 56C42 54 56 50 58 42H64Z" fill="#FBCFE8" />
      {/* Left Hand Outline */}
      <path d="M16 38V48C16 57 23 64 33 64C38 64 41 60 41 56C36 53 23 48 22 38" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Right Hand Outline */}
      <path d="M64 38V48C64 57 57 64 47 64C42 64 39 60 39 56C44 53 57 48 58 38" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Baby silhouette */}
      <circle cx="40" cy="24" r="4.5" stroke="#18181B" strokeWidth="2.2" fill="white" />
      <path d="M33 38C33 31 47 31 47 38" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M36 34L30 39" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 34L50 39" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 38V45" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <path d="M43 38V45" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 6. Elder Care (Elderly person walking with cane)
export function ElderCareIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel teal fill on person torso */}
      <path d="M32 30C32 28 35 26 40 26C45 26 48 28 48 30V48H32V30Z" fill="#A7F3D0" />
      {/* Head */}
      <circle cx="40" cy="18" r="5" stroke="#18181B" strokeWidth="2.4" fill="white" />
      {/* Upper body / coat with soft posture */}
      <path d="M30 32C30 26 50 26 50 32V46H30V32Z" stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Left leg */}
      <path d="M36 46V64" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Right leg */}
      <path d="M44 46V64" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Walking cane / stick */}
      <path d="M56 36C56 32 59 32 60 35V64" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// 7. Airbnb Cleaning (House with sun & water waves)
export function AirbnbCleaningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel terracotta/peach fill on roof and house */}
      <path d="M38 18L18 34H24V54H52V34H58L38 18Z" fill="#FED7AA" />
      {/* Roof & House Outline */}
      <path d="M16 34L38 16L60 34" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 34V52H54V34" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Windows */}
      <rect x="29" y="38" width="5" height="5" rx="1" fill="#18181B" />
      <rect x="42" y="38" width="5" height="5" rx="1" fill="#18181B" />
      {/* Smiling sun on top right */}
      <circle cx="62" cy="18" r="4.5" stroke="#18181B" strokeWidth="2" fill="#FDE047" />
      <path d="M62 10V12M62 24V26M54 18H56M68 18H70" stroke="#18181B" strokeWidth="1.8" strokeLinecap="round" />
      {/* Clean water waves below */}
      <path d="M14 58C18 56 22 60 26 58C30 56 34 60 38 58C42 56 46 60 50 58C54 56 58 60 62 58" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 64C18 62 22 66 26 64C30 62 34 66 38 64C42 62 46 66 50 64C54 62 58 66 62 64" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 8. Laundry & Ironing (Classic clothes iron)
export function LaundryIroningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel gold / yellow fill on iron body */}
      <path d="M20 54C20 40 32 30 50 30H64C64 45 60 54 20 54Z" fill="#FEF08A" />
      {/* Iron Outline */}
      <path d="M18 54C18 36 32 28 52 28H66C66 45 62 54 18 54Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Handle */}
      <path d="M28 28V20C28 17 31 15 36 15H58C62 15 64 17 64 21V28" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Ironing Board Line */}
      <rect x="14" y="56" width="56" height="5" rx="2.5" fill="white" stroke="#18181B" strokeWidth="2.2" />
    </svg>
  );
}

// 9. Dog Walking (Walking dog with leash)
export function DogWalkingIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Soft coral / peach fill on dog body */}
      <rect x="22" y="32" width="28" height="18" rx="4" fill="#FCA5A5" />
      {/* Dog Head */}
      <path d="M50 34V22C50 20 54 18 58 18H64C66 18 68 20 68 24C68 28 66 30 62 30H50" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="white" />
      <circle cx="60" cy="24" r="1.5" fill="#18181B" />
      {/* Tail */}
      <path d="M22 36L14 30" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Body Outline */}
      <rect x="22" y="32" width="28" height="18" rx="4" stroke="#18181B" strokeWidth="2.4" />
      {/* Legs */}
      <path d="M26 50V62M32 50V62M42 50V62M48 50V62" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Leash */}
      <path d="M42 32L24 16" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 10. Express Cleaning (Running / hopping bunny)
export function ExpressCleaningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel lilac / pink fill on running hind legs & flank */}
      <path d="M24 38C20 40 18 46 22 52L36 60C42 60 48 56 46 48C42 42 30 36 24 38Z" fill="#F5D0FE" />
      {/* Running bunny outline */}
      <path d="M50 26C56 22 62 26 62 32C62 38 54 44 48 46C42 48 30 46 24 38C20 44 24 54 36 60C44 60 52 54 58 48L64 52" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Ears */}
      <path d="M48 26L42 12C41 10 44 9 46 12L52 24" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M52 24L56 12C57 10 60 11 59 14L56 26" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
      {/* Little tail */}
      <circle cx="18" cy="38" r="3" stroke="#18181B" strokeWidth="2" fill="white" />
      <circle cx="56" cy="30" r="1.5" fill="#18181B" />
    </svg>
  );
}

// 11. Extra Care (Heart with a medical / care plus cross)
export function ExtraCareIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel coral / peach fill inside heart */}
      <path d="M40 60C38 58 18 44 18 30C18 20 26 14 34 16C37 17 39 19 40 21C41 19 43 17 46 16C54 14 62 20 62 30C62 44 42 58 40 60Z" fill="#FECDD3" />
      {/* Heart Outline */}
      <path d="M40 62C38 60 18 44 18 30C18 20 26 14 34 16C37 17 39 19 40 21C41 19 43 17 46 16C54 14 62 20 62 30C62 44 42 60 40 62Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Plus / Care Cross */}
      <path d="M46 28V46M37 37H55" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

// 12. Mama Fua & Laundry Care (Washing tub with soap bubbles)
export function MamaFuaIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M22 34L26 62H54L58 34" fill="#FEF08A" />
      <path d="M18 34H62L56 62H24L18 34Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 34H66" stroke="#18181B" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="22" r="5" stroke="#18181B" strokeWidth="2" fill="#BAE6FD" />
      <circle cx="46" cy="18" r="6" stroke="#18181B" strokeWidth="2" fill="#A7F3D0" />
      <circle cx="56" cy="26" r="4" stroke="#18181B" strokeWidth="2" fill="#FED7AA" />
      <path d="M30 46C34 44 38 48 42 46C46 44 50 48 54 46" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 13. Plumbing & Water Repairs (Wrench and dripping pipe)
export function PlumbingIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M48 38C48 48 38 58 38 58C38 58 28 48 28 38C28 32 32 26 38 26C44 26 48 32 48 38Z" fill="#BAE6FD" stroke="#18181B" strokeWidth="2.4" />
      {/* Pipe wrench */}
      <path d="M42 22L54 14C58 11 64 15 62 20L58 26" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M52 22L66 42" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="38" r="2.5" fill="#18181B" />
    </svg>
  );
}

// 14. Electrical & Solar (Lightbulb and lightning ray)
export function ElectricalIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M30 32C30 22 38 16 48 16C58 16 66 22 66 32C66 38 62 44 58 48V56H38V48C34 44 30 38 30 32Z" fill="#FEF08A" stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Socket base */}
      <path d="M40 56H56V62C56 64 54 66 52 66H44C42 66 40 64 40 62V56Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      {/* Lightning bolt inside */}
      <path d="M50 24L42 36H50L46 46" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Glow rays */}
      <path d="M22 28L16 26M24 18L18 14M48 8V12" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 15. Fundi & Handyman (Crossed hammer and wrench)
export function FundiHandymanIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Hammer head */}
      <rect x="18" y="18" width="18" height="10" rx="3" fill="#FED7AA" stroke="#18181B" strokeWidth="2.4" />
      <path d="M27 28L54 58" stroke="#18181B" strokeWidth="3.2" strokeLinecap="round" />
      {/* Wrench head */}
      <circle cx="56" cy="22" r="7" fill="white" stroke="#18181B" strokeWidth="2.4" />
      <path d="M52 26L26 56" stroke="#18181B" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

// 16. Gardener & Landscaping (Potted plant and shears)
export function GardeningIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M28 46L32 64H48L52 46" fill="#FED7AA" />
      <path d="M26 46H54L50 64H30L26 46Z" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Big leaf */}
      <path d="M40 44C40 30 26 22 24 16C36 16 46 26 40 44Z" fill="#A7F3D0" stroke="#18181B" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M40 44C40 30 54 22 56 16C44 16 34 26 40 44Z" fill="#6EE7B7" stroke="#18181B" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

// 17. House Painting (Paint roller)
export function PaintingIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="22" y="16" width="36" height="14" rx="4" fill="#FDE68A" stroke="#18181B" strokeWidth="2.4" />
      <path d="M58 23H66V40H44V50" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="40" y="50" width="8" height="16" rx="2" fill="#18181B" />
      <path d="M26 34L26 42" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M34 34L34 46" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 18. Movers & House Relocation (Truck)
export function MoversIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="14" y="24" width="34" height="26" rx="3" fill="#FECDD3" stroke="#18181B" strokeWidth="2.4" />
      <path d="M48 32H60L66 40V50H48V32Z" fill="white" stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="26" cy="54" r="5" stroke="#18181B" strokeWidth="2.4" fill="white" />
      <circle cx="56" cy="54" r="5" stroke="#18181B" strokeWidth="2.4" fill="white" />
    </svg>
  );
}

// 19. Pest Control & Fumigation
export function PestControlIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M40 16L60 26V44C60 54 40 64 40 64C40 64 20 54 20 44V26L40 16Z" fill="#A7F3D0" stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="40" cy="40" r="6" fill="#18181B" />
      <path d="M36 34L32 30M44 34L48 30M32 40H48M34 46L30 50M46 46L50 50" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 20. Cook / Meal Preparation
export function CookMealIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M28 36C22 36 22 24 30 22C30 16 40 14 44 20C48 14 58 16 58 22C66 24 66 36 60 36H28Z" fill="#FED7AA" stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="28" y="36" width="32" height="10" rx="2" fill="white" stroke="#18181B" strokeWidth="2.2" />
      <path d="M22 56H66" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M34 50C34 50 38 48 44 50C50 52 54 50 54 50" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 21. Carpet & Sofa Cleaning
export function SofaCarpetIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M22 32C22 28 26 24 30 24H50C54 24 58 28 58 32V42H22V32Z" fill="#FECDD3" stroke="#18181B" strokeWidth="2.4" />
      <rect x="16" y="34" width="10" height="20" rx="3" fill="white" stroke="#18181B" strokeWidth="2.2" />
      <rect x="54" y="34" width="10" height="20" rx="3" fill="white" stroke="#18181B" strokeWidth="2.2" />
      <rect x="22" y="42" width="36" height="12" rx="2" fill="white" stroke="#18181B" strokeWidth="2.2" />
      <path d="M26 54V62M54 54V62" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// 22. Appliance Repair (Fridge & Washer)
export function ApplianceRepairIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="22" y="16" width="36" height="48" rx="6" fill="#BAE6FD" stroke="#18181B" strokeWidth="2.4" />
      <path d="M22 34H58" stroke="#18181B" strokeWidth="2.2" />
      <path d="M28 24V28M28 42V48" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50" cy="52" r="3" fill="#F59E0B" />
    </svg>
  );
}

// 23. Security & CCTV Camera
export function SecurityCctvIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M16 26H32" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M24 26V36L34 38" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="30" y="24" width="34" height="18" rx="4" transform="rotate(15 30 24)" fill="#FEF08A" stroke="#18181B" strokeWidth="2.4" />
      <circle cx="56" cy="38" r="4.5" fill="#18181B" />
      <circle cx="56" cy="38" r="1.5" fill="#EF4444" />
    </svg>
  );
}

// 24. Car Wash & Detailing
export function CarWashIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M20 44L28 30H52L60 44V54H20V44Z" fill="#A7F3D0" stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="28" cy="54" r="4" stroke="#18181B" strokeWidth="2.4" fill="white" />
      <circle cx="52" cy="54" r="4" stroke="#18181B" strokeWidth="2.4" fill="white" />
      {/* Sparkles & bubbles */}
      <circle cx="34" cy="20" r="3" fill="#BAE6FD" stroke="#18181B" strokeWidth="1.8" />
      <circle cx="48" cy="18" r="2.5" fill="#BAE6FD" stroke="#18181B" strokeWidth="1.8" />
      <path d="M22 22L24 18L26 22L30 24L26 26L24 30L22 26L18 24L22 22Z" fill="#F59E0B" />
    </svg>
  );
}

// 25. TV Mounting & Brackets
export function TvMountingIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="16" y="20" width="48" height="32" rx="4" fill="#E2E8F0" stroke="#18181B" strokeWidth="2.4" />
      <rect x="22" y="24" width="36" height="22" rx="2" fill="white" stroke="#18181B" strokeWidth="1.8" />
      {/* Mounting wall bracket */}
      <path d="M40 52V64M30 64H50" stroke="#18181B" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// 26. Errand Runner & Concierge
export function ErrandRunnerIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="22" y="32" width="36" height="32" rx="6" fill="#FDE68A" stroke="#18181B" strokeWidth="2.4" />
      <path d="M30 32C30 22 50 22 50 32" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M34 44H46M34 52H42" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      {/* Swift motion lines */}
      <path d="M12 36H16M10 44H16M14 52H18" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 27. Other (Sparkles / customizable magic task)
export function OtherServiceIcon({ className = '', size = 56 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Pastel gold filled circle / badge */}
      <circle cx="40" cy="40" r="24" fill="#FEF08A" stroke="#18181B" strokeWidth="2.4" />
      {/* 3 clean centered dots */}
      <circle cx="30" cy="40" r="3.2" fill="#18181B" />
      <circle cx="40" cy="40" r="3.2" fill="#18181B" />
      <circle cx="50" cy="40" r="3.2" fill="#18181B" />
      {/* Sparkle star on top right */}
      <path d="M54 20L56 15L58 20L63 22L58 24L56 29L54 24L49 22L54 20Z" fill="#F59E0B" />
      <path d="M22 54L23 51L24 54L27 55L24 56L23 59L22 56L19 55L22 54Z" fill="#F59E0B" />
    </svg>
  );
}

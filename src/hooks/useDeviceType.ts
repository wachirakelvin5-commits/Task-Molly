import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'laptop';

export function useDeviceType() {
  const [device, setDevice] = useState<{
    type: DeviceType;
    isPhone: boolean;
    isTablet: boolean;
    isLaptop: boolean;
  }>({
    type: 'laptop',
    isPhone: false,
    isTablet: false,
    isLaptop: true,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let type: DeviceType = 'laptop';
      
      if (width < 768) {
        type = 'phone';
      } else if (width >= 768 && width < 1024) {
        type = 'tablet';
      } else {
        type = 'laptop';
      }

      setDevice({
        type,
        isPhone: type === 'phone',
        isTablet: type === 'tablet',
        isLaptop: type === 'laptop',
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return device;
}

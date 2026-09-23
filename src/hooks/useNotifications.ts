import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { messaging, db } from '../firebase';
import { UserProfile } from '../types';

export function useNotifications(user: UserProfile | null) {
  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      try {
        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        if (!vapidKey || vapidKey === 'MY_VAPID_KEY') {
          console.warn('FCM VAPID key is missing or not configured. Push notifications will not work.');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Get FCM token
          const token = await getToken(messaging, { 
            vapidKey: vapidKey 
          });
          
          if (token) {
            console.log('FCM Token:', token);
            // Save token to Firestore
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: token
            });
          }
        }
      } catch (error) {
        console.error('Error getting FCM token:', error);
      }
    };

    requestPermission();

    // Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      // You can show a toast or custom notification here
      if (payload.notification) {
        toast.info(payload.notification.title, {
          description: payload.notification.body,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);
}

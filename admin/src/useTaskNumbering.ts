import { useEffect } from 'react';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../src/firebase';
import { toDate } from '../../src/lib/requestModel';
import { planTaskNumbers } from '../../src/lib/taskRef';

/**
 * While an admin has the site open, give every request without a task number the next one
 * (oldest first). Existing requests are numbered the first time this runs; new ones within
 * seconds of being posted. Only admins may write the number (firestore.rules: isAdmin()).
 */
export function useTaskNumbering() {
  useEffect(() => {
    let latest: Parameters<typeof planTaskNumbers>[0] = [];
    let running = false;
    let again = false;
    let stopped = false;

    async function assign() {
      if (running) {
        again = true; // New data arrived mid-run: go round once more when this run ends.
        return;
      }
      running = true;
      again = false;
      try {
        for (const { id, taskNumber } of planTaskNumbers(latest)) {
          if (stopped) return;
          // Only set it if nobody (e.g. the other admin) numbered it in the meantime.
          const ref = doc(db, 'serviceRequests', id);
          const saved = await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists() || typeof snap.data().taskNumber === 'number') return false;
            tx.update(ref, { taskNumber });
            return true;
          }).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, `serviceRequests/${id}`);
            return false;
          });
          // Numbered elsewhere, deleted, or not saved: stop and replan on the next update.
          if (!saved) return;
        }
      } finally {
        running = false;
        if (again && !stopped) void assign();
      }
    }

    const unsubscribe = onSnapshot(
      collection(db, 'serviceRequests'),
      (snap) => {
        // Skip our own unsent writes so numbers are planned from saved data only.
        if (snap.metadata.hasPendingWrites) return;
        latest = snap.docs.map((d) => ({ id: d.id, taskNumber: d.data().taskNumber, createdAt: toDate(d.data().createdAt) }));
        void assign();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'serviceRequests'),
    );
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, []);
}

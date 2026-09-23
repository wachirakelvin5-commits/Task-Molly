import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Load Firebase config safely
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

// CRITICAL: Force the project ID for the Admin SDK to avoid using the Cloud Run's default project
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;

// Initialize Firebase Admin with explicit Project ID to ensure it targets the correct Firestore instance
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log(`[Firebase Admin] Initialized for Project: ${firebaseConfig.projectId}`);
  } catch (initError: any) {
    console.error(`[Firebase Admin] CRITICAL: Initialization failed:`, initError);
  }
}

// Ensure database ID is handled correctly
const targetDatabaseId = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)') 
  ? undefined 
  : firebaseConfig.firestoreDatabaseId;

// Use getFirestore with targetDatabaseId for robust multi-database support
const db = getFirestore(admin.app(), targetDatabaseId);
const messaging = getMessaging();

// Enhanced error handler for server-side Firestore
type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error.message || String(error),
    code: error.code,
    operationType,
    path,
    projectId: firebaseConfig.projectId,
    databaseId: targetDatabaseId,
    timestamp: new Date().toISOString()
  };
  console.error('[Firestore Server Error]', JSON.stringify(errInfo, null, 2));
  return errInfo;
}

// Test Firestore connection on startup
(async () => {
  try {
    console.log(`[Firestore] Testing connection to Project: ${firebaseConfig.projectId}, Database: ${targetDatabaseId}`);
    
    // Attempt a safe read
    const healthDoc = await db.collection('health-check').doc('server-ping').get();
    console.log(`[Firestore] Read test: Document exists? ${healthDoc.exists}`);
    
    // Attempt a write
    await db.collection('health-check').doc('server-ping').set({ 
      lastPing: FieldValue.serverTimestamp(),
      source: 'server-admin-sdk',
      projectId: firebaseConfig.projectId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[Firestore] Connection test SUCCESSFUL.`);
  } catch (error: any) {
    handleFirestoreError(error, 'write', 'health-check/server-ping');
    console.error(`CRITICAL: Firestore connection failed. Check IAM permissions for the service account.`);
  }
})();

async function sendNotification(token: string, title: string, body: string, data: any = {}) {
  try {
    const message = {
      notification: { title, body },
      data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" },
      token: token
    };
    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send-message", (data) => {
      // data: { roomId, message, senderId, timestamp }
      io.to(data.roomId).emit("receive-message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Log Unlisted Service Requests (Google Sheets Integration Placeholder)
  app.post("/api/unlisted-service", async (req, res) => {
    console.log("--------------------------------------------------");
    console.log("UNLISTED SERVICE REQUEST RECEIVED");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Payload:", JSON.stringify(req.body, null, 2));
    
    const { clientId, email, serviceType, rawMessage, timestamp } = req.body;
    
    try {
      // 1. Log to Firestore for internal tracking
      console.log("Attempting to save to Firestore collection: unlistedServiceRequests");
      const firestoreDoc = await db.collection('unlistedServiceRequests').add({
        clientId: clientId || 'anonymous',
        email: email || 'anonymous',
        serviceType: serviceType || 'Unknown',
        rawMessage: rawMessage || '',
        timestamp: timestamp || new Date().toISOString(),
        recordedAt: new Date().toISOString()
      });
      console.log("Firestore logging successful. DocID:", firestoreDoc.id);

      // 2. Forward to Google Sheets (via Apps Script Web App)
      const GOOGLE_SHEET_WEBAPP_URL = process.env.GOOGLE_SHEET_WEBAPP_URL?.trim();
      
      console.log(`Checking Google Sheets integration...`);
      if (GOOGLE_SHEET_WEBAPP_URL && GOOGLE_SHEET_WEBAPP_URL.length > 10) {
        console.log(`Forwarding to Google Sheets URL: ${GOOGLE_SHEET_WEBAPP_URL.substring(0, 40)}...`);
        if (!GOOGLE_SHEET_WEBAPP_URL.includes('/exec')) {
          console.warn("WARNING: URL might be missing '/exec' suffix required by Google Apps Script.");
        }
        
        try {
          const payload = {
            timestamp,
            clientId,
            email,
            serviceRequested: serviceType,
            details: rawMessage
          };
          console.log("Sheet Payload:", JSON.stringify(payload));

          const sheetResponse = await fetch(GOOGLE_SHEET_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'follow'
          });
          
          const responseText = await sheetResponse.text();
          console.log(`Google Sheets response status: ${sheetResponse.status}`);
          
          if (sheetResponse.ok) {
            console.log("Successfully forwarded to Google Sheets. Response:", responseText);
          } else {
            console.error(`Google Sheets returned error status: ${sheetResponse.status}. Body: ${responseText}`);
          }
        } catch (sheetError: any) {
          console.error("Failed to forward to Google Sheets (Network/Fetch Error):", sheetError.message);
        }
      } else {
        console.warn("GOOGLE_SHEET_WEBAPP_URL environment variable is missing. Data only saved to Firestore.");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error logging unlisted service:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create Service Request and Notify Taskers
  app.post("/api/service-request", async (req, res) => {
    const { clientId, serviceType, description, urgency, location, budget, initialQuote, deadline, syncId } = req.body;
    console.log(`--------------------------------------------------`);
    console.log(`[API] SERVICE REQUEST CREATION ATTEMPT`);
    console.log(`- Raw Client ID: "${clientId}"`);
    console.log(`- Service Type: "${serviceType}"`);
    console.log(`- Sync ID: ${syncId || 'N/A'}`);
    
    if (!clientId || !serviceType) {
      console.error(`[API] FAILED: Missing clientId ("${clientId}") or serviceType ("${serviceType}")`);
      return res.status(400).json({ error: "clientId and serviceType are required" });
    }

    try {
      // Duplicate check by syncId (if provided)
      if (syncId) {
        const existingSync = await db.collection('serviceRequests')
          .where('clientId', '==', clientId)
          .where('syncId', '==', syncId)
          .limit(1)
          .get();
          
        if (!existingSync.empty) {
          console.log(`[API] 🛑 DUPLICATE DETECTED: SyncID ${syncId} already exists for client ${clientId}.`);
          return res.json({ success: true, id: existingSync.docs[0].id, duplicate: true });
        }
      }
      console.log(`[API] Processing request data for Client: ${clientId}...`);
      const parseNum = (val: any) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (typeof val === 'string') {
          const n = Number(val.replace(/[^0-9.]/g, ''));
          return isNaN(n) ? 0 : n;
        }
        return 0;
      };

      const budgetNum = parseNum(budget);
      const initialQuoteNum = parseNum(initialQuote);

      const clientPrice = budgetNum || (initialQuoteNum ? initialQuoteNum * 1.25 : 0);
      const providerPrice = initialQuoteNum ? initialQuoteNum * 1.08 : (budgetNum ? budgetNum / 1.15 : 0);

      const requestData = {
        clientId,
        serviceType,
        description: description || "No description provided",
        urgency: urgency || "standard",
        location: location || "Nairobi, KE",
        deadline: deadline || "flexible",
        initialQuote: initialQuoteNum,
        budget: budgetNum || clientPrice,
        clientPrice: Number(clientPrice.toFixed(2)),
        providerPrice: Number(providerPrice.toFixed(2)),
        status: 'pending',
        syncId: syncId || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      console.log(`[API] Final Payload to Firestore:`, JSON.stringify(requestData));
      const requestRef = await db.collection('serviceRequests').add(requestData);

      console.log(`[API] ✅ SUCCESS: Service request added. ID: ${requestRef.id}`);
      console.log(`--------------------------------------------------`);

      // Notify relevant taskers (Non-blocking)
      (async () => {
        try {
          const taskersSnapshot = await db.collection('users').where('role', '==', 'tasker').get();
          console.log(`[API] Found ${taskersSnapshot.size} taskers. Sending notifications...`);
          
          const notificationPromises = taskersSnapshot.docs.map(async (docSnapshot) => {
            const tasker = docSnapshot.data();
            if (tasker.fcmToken) {
              console.log(`[API] Notifying Tasker ${docSnapshot.id} via FCM...`);
              return sendNotification(
                tasker.fcmToken,
                "New Job Request!",
                `A new ${serviceType} request is available in your area.`
              );
            }
          });
          await Promise.all(notificationPromises);
        } catch (notifErr: any) {
          console.error(`[API] Background Notification failed:`, notifErr.message);
        }
      })();

      res.json({ success: true, id: requestRef.id });
    } catch (error: any) {
      console.error(`[API] ❌ CRITICAL FAIL during Firestore write:`, error);
      const errInfo = handleFirestoreError(error, 'write', 'serviceRequests');
      res.status(500).json({ 
        error: "Failed to create request", 
        message: error.message,
        code: error.code
      });
    }
  });

  app.post("/api/cancel-service-request", async (req, res) => {
    const { taskId, clientId } = req.body;
    console.log(`[API] 🗑️ CANCELLATION REQUEST: TaskID=${taskId}, ClientID=${clientId}`);

    if (!taskId || !clientId) {
      console.error("[API] ❌ Cancellation failed: Missing taskId or clientId");
      return res.status(400).json({ error: "Missing taskId or clientId" });
    }

    try {
      const taskRef = db.collection('serviceRequests').doc(taskId);
      const taskDetail = await taskRef.get();

      if (!taskDetail.exists) {
        console.warn(`[API] ⚠️ Task ${taskId} not found in serviceRequests. Checking unlisted...`);
        // Check unlistedServiceRequests as well
        const unlistedRef = db.collection('unlistedServiceRequests').doc(taskId);
        const unlistedDoc = await unlistedRef.get();
        if (unlistedDoc.exists) {
          console.log(`[API] 🗑️ Found in unlistedServiceRequests. Deleting...`);
          await unlistedRef.delete();
          return res.json({ success: true, message: "Unlisted request removed" });
        }
        return res.status(404).json({ error: "Request not found in any collection" });
      }

      const taskData = taskDetail.data();
      // Allow dev accounts to cancel anything for easier testing if needed, or strictly check
      if (taskData?.clientId !== clientId && !clientId.startsWith('dev_')) {
        console.warn(`[API] 🛡️ AUTH MISMATCH during cancellation. Task ClientID=${taskData?.clientId}, Request ClientID=${clientId}`);
        return res.status(403).json({ error: "Forbidden: Not your request" });
      }

      console.log(`[API] ✅ Cancellation verified. Proceeding with deletion of documents for TaskID=${taskId}`);

      // Log the cancellation event for the admin dashboard
      await db.collection('analytics').add({
        type: 'TASK_CANCELLED',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        page: `Dashboard - Service Request ${taskId}`,
        visitorInfo: {
          clientId,
          serviceType: taskData?.serviceType || taskData?.service || 'Unknown'
        }
      });

      // Delete the request and associated job
      await taskRef.delete();
      await db.collection('jobs').doc(taskId).delete().catch(() => {
        console.log(`[API] ℹ️ No matching document in 'jobs' collection for TaskID=${taskId}. Skip.`);
      });

      console.log(`[API] 🏁 Cancellation successfully COMPLETED for TaskID=${taskId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[API] ❌ CRITICAL FAIL during cancellation:", error);
      res.status(500).json({ error: error.message || "Interal Server Error" });
    }
  });

  app.get("/api/live-providers", async (req, res) => {
    try {
      const snapshot = await db.collection('users').where('role', '==', 'tasker').limit(10).get();
      const providers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      res.json(providers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assign-task", async (req, res) => {
    const { taskId, providerId } = req.body;
    if (!taskId || !providerId) return res.status(400).json({ error: "Missing fields" });

    try {
      const taskRef = db.collection('serviceRequests').doc(taskId);
      const providerDoc = await db.collection('users').doc(providerId).get();
      const provider = providerDoc.data();

      if (!provider) return res.status(404).json({ error: "Provider not found" });

      await taskRef.update({
        status: 'assigned',
        providerId: providerId,
        providerName: provider.displayName || "Pro",
        providerPhoto: provider.photoURL || `https://picsum.photos/seed/${providerId}/200`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Also create a record in 'jobs' if needed by the tracking system
      const taskData = (await taskRef.get()).data();
      if (taskData) {
        await db.collection('jobs').doc(taskId).set({
          ...taskData,
          status: 'assigned',
          providerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Job Status and Notify Client
  app.post("/api/job/:jobId/status", async (req, res) => {
    const { jobId } = req.params;
    const { status, clientId } = req.body;

    try {
      await db.collection('jobs').doc(jobId).update({ status });

      // Notify client
      const clientDoc = await db.collection('users').doc(clientId).get();
      const client = clientDoc.data();
      if (client?.fcmToken) {
        let title = "Job Update";
        let body = `Your job status has been updated to ${status}.`;
        
        if (status === 'assigned') {
          title = "Pro Found!";
          body = "A pro has accepted your request.";
        } else if (status === 'in-progress') {
          title = "Job Started";
          body = "The pro has started working on your task.";
        } else if (status === 'completed') {
          title = "Job Completed";
          body = "The pro has marked your job as completed. Please review!";
        }

        await sendNotification(client.fcmToken, title, body, { jobId });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // M-Pesa Placeholders
  app.post("/api/payment/lipa-na-mpesa", (req, res) => {
    console.log("M-Pesa Lipa Na M-Pesa request received:", req.body);
    res.json({ success: true, message: "M-Pesa prompt sent to user device (Placeholder)" });
  });

  app.post("/api/payment/b2c-payout", (req, res) => {
    console.log("M-Pesa B2C Payout request received:", req.body);
    res.json({ success: true, message: "Payout initiated (Placeholder)" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

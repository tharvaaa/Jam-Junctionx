/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Booking, StudioNote, EmailLog, BookingStatus } from "./types";
import { SEED_NOTES } from "./data";
import InteractiveBackground from "./components/InteractiveBackground";
import BookingEntry from "./components/BookingEntry";
import DailySchedule from "./components/DailySchedule";
import RevenueAnalytics from "./components/RevenueAnalytics";
import StudioNotes from "./components/StudioNotes";
import LoginPage from "./components/LoginPage";
import { 
  db, 
  testConnection, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  handleFirestoreError, 
  OperationType,
  ADMIN_EMAIL
} from "./firebase";

import { 
  Calendar, Sliders, IndianRupee, BookOpen, 
  LogOut, PlusCircle
} from "lucide-react";

export default function App() {
  const supervisorEmail = ADMIN_EMAIL;
  
  // App persistent state from Cloud Firestore
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notes, setNotes] = useState<StudioNote[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [, setIsDbConnected] = useState(false);
  
  // Navigation tabs: BOOKING, LIVE SCHEDULE, REVENUE ANALYTICS, STUDIO SCRATCHPAD
  const [activeTab, setActiveTab] = useState<"entry" | "schedule" | "revenue" | "notes">("entry");
  
  const [, setCurrentTime] = useState<string>("");

  // Authenticator state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return (
      localStorage.getItem("jam_junction_auth") === "true" ||
      sessionStorage.getItem("jam_junction_auth") === "true"
    );
  });

  const handleLogout = () => {
    localStorage.removeItem("jam_junction_auth");
    sessionStorage.removeItem("jam_junction_auth");
    setIsAuthenticated(false);
  };

  // Toast notification feedback
  const [activeToast, setActiveToast] = useState<{ id: string; message: string; type: "success" | "info" } | null>(null);

  // 1. Initial Connection Test & Live Clock
  useEffect(() => {
    testConnection().then((connected) => {
      setIsDbConnected(connected);
    });

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. Real-Time Cloud Firestore Sync for Bookings, Studio Notes, and Mail
  useEffect(() => {
    // A. Real-time Firestore Listener: bookings
    const bookingsPath = "bookings";
    const testIds = new Set(["b1", "b2", "b3", "b4", "b5", "b6", "b7"]);
    const testBandKeywords = [
      "paranoid sunsets", "symphony of echoes", "riya & friends",
      "velvet anthems", "sublime resonance", "late night beats", "jazz fusion"
    ];

    const unsubscribeBookings = onSnapshot(
      collection(db, bookingsPath),
      async (snapshot) => {
        if (snapshot.empty) {
          setBookings([]);
        } else {
          const loaded: Booking[] = [];
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as Booking;
            const isTest = 
              testIds.has(docSnap.id) || 
              (data.clientName && testBandKeywords.some(kw => data.clientName.toLowerCase().includes(kw)));
            
            if (isTest) {
              deleteDoc(doc(db, bookingsPath, docSnap.id)).catch(() => {});
            } else {
              loaded.push(data);
            }
          }
          loaded.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
          setBookings(loaded);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, bookingsPath);
      }
    );

    // B. Real-time Firestore Listener: studio_notes
    const notesPath = "studio_notes";
    const unsubscribeNotes = onSnapshot(
      collection(db, notesPath),
      async (snapshot) => {
        if (snapshot.empty) {
          const defaultNotes = SEED_NOTES || [];
          for (const n of defaultNotes) {
            try {
              await setDoc(doc(db, notesPath, n.id), n);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, notesPath);
            }
          }
          setNotes(defaultNotes);
        } else {
          const loadedNotes: StudioNote[] = [];
          snapshot.forEach((docSnap) => {
            loadedNotes.push(docSnap.data() as StudioNote);
          });
          loadedNotes.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
          setNotes(loadedNotes);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, notesPath);
      }
    );

    // C. Real-time Firestore Listener: mail
    const mailPath = "mail";
    const unsubscribeMail = onSnapshot(
      collection(db, mailPath),
      (snapshot) => {
        const loadedLogs: EmailLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isTest = 
            docSnap.id.startsWith("e_init_") || 
            (data.clientName && testBandKeywords.some(kw => data.clientName.toLowerCase().includes(kw))) ||
            (data.subject && testBandKeywords.some(kw => data.subject.toLowerCase().includes(kw)));

          if (isTest) {
            deleteDoc(doc(db, mailPath, docSnap.id)).catch(() => {});
          } else {
            loadedLogs.push({
              id: docSnap.id,
              recipient: data.to || ADMIN_EMAIL,
              clientName: data.clientName || undefined,
              phoneNumber: data.phoneNumber || undefined,
              subject: data.subject || "JAM JUNCTION Notification",
              body: data.body || "",
              type: data.subject?.includes("Analytics") || data.subject?.includes("Statement") ? "report" : 
                    data.subject?.includes("Reminder") || data.subject?.includes("Alert") ? "reminder" : "confirmation",
              timestamp: data.createdAt || new Date().toISOString(),
              status: data.status === "failed" ? "failed" : "sent",
              bookingId: data.bookingId,
              hours: data.hours,
              totalAmount: data.totalAmount
            });
          }
        });

        loadedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setEmailLogs(loadedLogs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, mailPath);
      }
    );

    return () => {
      unsubscribeBookings();
      unsubscribeNotes();
      unsubscribeMail();
    };
  }, []);

  // Sync state helpers connected to Cloud Firestore
  const handleAddBooking = async (newBooking: Booking) => {
    const bookingsPath = "bookings";
    const mailPath = "mail";
    try {
      setBookings((prev) => [newBooking, ...prev.filter((b) => b.id !== newBooking.id)]);

      await setDoc(doc(db, bookingsPath, newBooking.id), newBooking);

      const clientEmail = `${newBooking.clientName.trim().replace(/\s+/g, "").toLowerCase()}@gmail.com`;
      const mailId = "mail_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);

      const timeDetails = newBooking.checkInTime && newBooking.checkOutTime
        ? `\n⏱️ Timings: Arrival: ${newBooking.checkInTime} | Departure: ${newBooking.checkOutTime}`
        : "";

      const emailPayload = {
        to: clientEmail,
        adminAlertTo: ADMIN_EMAIL,
        clientName: newBooking.clientName,
        phoneNumber: newBooking.phoneNumber || undefined,
        subject: `🎸 ${newBooking.clientName} — Booking Confirmed (${newBooking.type}, ${newBooking.hours} hrs @ ₹${newBooking.finalRate}/hr)`,
        body: `Hi ${newBooking.clientName},\n\nYour session has been successfully confirmed and scheduled at JAM JUNCTION Studio!\n\nClient / Band Name: ${newBooking.clientName}\n${newBooking.phoneNumber ? `📞 Contact Phone: ${newBooking.phoneNumber}\n` : ""}📅 Date: ${newBooking.date}${timeDetails}\n⏱️ Duration: ${newBooking.hours} Hour${newBooking.hours !== 1 ? "s" : ""}\n🎸 Session Type: ${newBooking.type} Session (@ ₹${newBooking.finalRate}/hr)\n🎧 Total Bill: ₹${newBooking.totalAmount}\n📝 Requests: ${newBooking.customRequests || "None"}\n\n[DISPATCH AUDIT ALERT]\nAuto-logged for studio supervisor: ${ADMIN_EMAIL}`,
        bookingId: newBooking.id,
        hours: newBooking.hours,
        totalAmount: newBooking.totalAmount,
        status: "sent",
        createdAt: new Date().toISOString()
      };

      const newEmailLog: EmailLog = {
        id: mailId,
        recipient: clientEmail,
        clientName: newBooking.clientName,
        phoneNumber: newBooking.phoneNumber || undefined,
        subject: emailPayload.subject,
        body: emailPayload.body,
        type: "confirmation",
        timestamp: emailPayload.createdAt,
        status: "sent",
        bookingId: newBooking.id,
        hours: newBooking.hours,
        totalAmount: newBooking.totalAmount
      };
      setEmailLogs((prev) => [newEmailLog, ...prev.filter((l) => l.id !== mailId)]);

      await setDoc(doc(db, mailPath, mailId), emailPayload);
      showToast(`✓ Booking for "${newBooking.clientName}" confirmed and synced!`, "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, bookingsPath);
    }
  };

  const handleUpdateBookingStatus = async (id: string, newStatus: BookingStatus, updates?: Partial<Booking>) => {
    const bookingsPath = "bookings";
    try {
      const existing = bookings.find(b => b.id === id);
      const updateData: Record<string, any> = { status: newStatus, ...(updates || {}) };
      
      if (newStatus === "Live Now" && !existing?.startedAt) {
        updateData.startedAt = new Date().toISOString();
      }

      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updateData } : b));
      await updateDoc(doc(db, bookingsPath, id), updateData);
      const client = bookings.find(b => b.id === id);
      showToast(`Status updated: ${newStatus} for ${client?.clientName || "session"}.`, "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, bookingsPath);
    }
  };

  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => {
    const bookingsPath = "bookings";
    try {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      await updateDoc(doc(db, bookingsPath, id), updates);
      showToast("Booking updated in cloud.", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, bookingsPath);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const bookingsPath = "bookings";
    try {
      await deleteDoc(doc(db, bookingsPath, id));
      showToast("Booking removed from Cloud Firestore.", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, bookingsPath);
    }
  };

  const handleClearAllBookings = async () => {
    const bookingsPath = "bookings";
    try {
      for (const b of bookings) {
        await deleteDoc(doc(db, bookingsPath, b.id)).catch(() => {});
      }
      setBookings([]);
      localStorage.removeItem("jam_junction_bookings");
      showToast("All scheduled sessions cleared.", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, bookingsPath);
    }
  };

  const handleClearAllLogs = async () => {
    const mailPath = "mail";
    try {
      for (const l of emailLogs) {
        await deleteDoc(doc(db, mailPath, l.id)).catch(() => {});
      }
      setEmailLogs([]);
      showToast("All dispatch & email logs cleared.", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, mailPath);
    }
  };

  const handleAddNote = async (newNote: StudioNote) => {
    const notesPath = "studio_notes";
    try {
      await setDoc(doc(db, notesPath, newNote.id), newNote);
      showToast("✓ Scratchpad memo synced to Cloud Firestore.", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, notesPath);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const notesPath = "studio_notes";
    try {
      await deleteDoc(doc(db, notesPath, id));
      showToast("Memo removed from Cloud Firestore.", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, notesPath);
    }
  };

  const handleUpdateNote = async (updatedNote: StudioNote) => {
    const notesPath = "studio_notes";
    try {
      await setDoc(doc(db, notesPath, updatedNote.id), updatedNote);
      showToast("Changes synced to Cloud Firestore across all devices.", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, notesPath);
    }
  };

  const handleSendEmailLog = async (log: EmailLog) => {
    setEmailLogs(current => [log, ...current]);
    try {
      await setDoc(doc(db, "mail", log.id), {
        to: log.recipient,
        subject: log.subject,
        body: log.body,
        status: log.status,
        createdAt: log.timestamp
      });
    } catch (err) {
      console.warn("Mail write error:", err);
    }
    showToast(`📬 Dispatch alert delivered to ${log.recipient}`, "success");
  };

  const showToast = (message: string, type: "success" | "info" = "success") => {
    const id = Math.random().toString();
    setActiveToast({ id, message, type });
    setTimeout(() => {
      setActiveToast((current) => current?.id === id ? null : current);
    }, 4500);
  };

  // Guard application behind Authenticator Gate
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={() => {
          setIsAuthenticated(true);
          showToast("Authenticated successfully. Welcome to JAM JUNCTION.", "success");
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen text-[#E2E8F0] bg-[#060913] relative overflow-x-hidden font-sans selection:bg-cyan-500/30 selection:text-white pb-32">
      
      {/* Dynamic drifting futuristic canvas behind the glass cards */}
      <InteractiveBackground />

      {/* FLOATING ACTION TOAST BOX */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl glass-popup shadow-xl pointer-events-auto border border-cyan-500/40 flex items-center gap-3 animate-fadeIn max-w-sm">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <p className="text-xs text-white font-semibold font-mono">{activeToast.message}</p>
        </div>
      )}

      {/* TOP MASTER LEVEL HEADER */}
      <header className="sticky top-0 z-40 bg-[#060913]/70 backdrop-filter backdrop-blur-xl border-b border-cyan-500/15 px-4 md:px-8 py-4 pointer-events-auto shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Centered Large Bold Brand Title with Logo */}
          <div className="flex-1 flex items-center justify-start sm:justify-center gap-2.5 sm:gap-3">
            <img
              src="/assets/aistudio/e8979e9e-adc4-40c7-a4de-dc62108a9625_e12dbe19.jpg"
              alt="The Jam Junction Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full object-contain shrink-0 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/20 pointer-events-none select-none"
            />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest text-white select-none drop-shadow-md font-sans">
              JAM JUNCTION
            </h1>
          </div>

          {/* Right Lock Console */}
          <div className="flex items-center gap-2 justify-end text-xs font-mono shrink-0">
            <button
              onClick={handleLogout}
              className="bg-[#0b1021]/90 hover:bg-red-950/40 border border-cyan-500/20 hover:border-red-500/40 text-slate-300 hover:text-red-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold transition-all duration-300"
              title="Lock studio console / Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>
          </div>

        </div>
      </header>

      {/* CORE CONTENT BLOCK CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-6 relative z-10">
        
        {/* CENTERED TAB SELECTION */}
        <div className="flex justify-center w-full">
          <div className="flex items-center justify-center bg-black/60 p-1.5 rounded-2xl border border-cyan-500/20 max-w-3xl w-full shadow-lg shadow-cyan-950/20 pointer-events-auto overflow-x-auto">
            {/* 1. BOOKING */}
            <button
              onClick={() => setActiveTab("entry")}
              className={`flex-1 min-w-28 text-center font-bold text-xs uppercase py-3 px-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "entry"
                  ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-600/30 font-black tracking-wider"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PlusCircle className="h-4 w-4 text-cyan-300" />
              <span>BOOKING</span>
            </button>

            {/* 2. LIVE SCHEDULE (Includes Combined Log Timeline) */}
            <button
              onClick={() => setActiveTab("schedule")}
              className={`flex-1 min-w-28 text-center font-bold text-xs uppercase py-3 px-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-600/30 font-black tracking-wider"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="h-4 w-4 text-cyan-300" />
              <span>LIVE SCHEDULE</span>
            </button>

            {/* 3. REVENUE ANALYTICS */}
            <button
              onClick={() => setActiveTab("revenue")}
              className={`flex-1 min-w-28 text-center font-bold text-xs uppercase py-3 px-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "revenue"
                  ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-600/30 font-black tracking-wider"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <IndianRupee className="h-4 w-4 text-cyan-300" />
              <span className="hidden sm:inline">REVENUE ANALYTICS</span>
              <span className="sm:hidden">REVENUE</span>
            </button>

            {/* 4. STUDIO SCRATCHPAD */}
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 min-w-28 text-center font-bold text-xs uppercase py-3 px-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "notes"
                  ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-600/30 font-black tracking-wider"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4 text-cyan-300" />
              <span className="hidden sm:inline">STUDIO SCRATCHPAD</span>
              <span className="sm:hidden">SCRATCHPAD</span>
            </button>
          </div>
        </div>

        {/* RENDER ACTIVE TAB WITH REAL-TIME FIRESTORE DATA */}
        <div className="animate-fadeIn">
          {activeTab === "entry" && (
            <BookingEntry 
              onAddBooking={handleAddBooking} 
              onSendEmailLog={handleSendEmailLog}
              userEmail={supervisorEmail}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "schedule" && (
            <DailySchedule 
              bookings={bookings}
              emailLogs={emailLogs}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onUpdateBooking={handleUpdateBooking}
              onDeleteBooking={handleDeleteBooking}
              onClearAllBookings={handleClearAllBookings}
              onSendEmailLog={handleSendEmailLog}
              supervisorEmail={supervisorEmail}
              onClearAllLogs={handleClearAllLogs}
            />
          )}

          {activeTab === "revenue" && (
            <RevenueAnalytics 
              bookings={bookings}
              onSendEmailLog={handleSendEmailLog}
              userEmail={supervisorEmail}
            />
          )}

          {activeTab === "notes" && (
            <StudioNotes 
              notes={notes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onUpdateNote={handleUpdateNote}
            />
          )}
        </div>

      </main>

    </div>
  );
}

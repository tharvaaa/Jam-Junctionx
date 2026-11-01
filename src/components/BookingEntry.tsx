/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Booking, BookingType, EmailLog } from "../types";
import { 
  Plus, Music, Calendar, IndianRupee, 
  Check, Mic2, FileAudio, ArrowRight, Clock, Phone,
  LogIn, LogOut, RotateCcw, Sparkles
} from "lucide-react";

interface BookingEntryProps {
  onAddBooking: (booking: Booking) => void;
  onSendEmailLog: (log: EmailLog) => void;
  userEmail: string;
  onNavigateTab?: (tab: "entry" | "schedule" | "revenue" | "notes") => void;
}

export default function BookingEntry({ onAddBooking, onSendEmailLog, userEmail, onNavigateTab }: BookingEntryProps) {
  // Booking Form State
  const [clientName, setClientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  // Time Noting System State (Arrival & Departure times)
  const [checkInTime, setCheckInTime] = useState<string>("");
  const [checkOutTime, setCheckOutTime] = useState<string>("");
  
  // Duration state: supports half-hour increments or any custom decimal hours
  const [hours, setHours] = useState<number>(2);
  const [sessionType, setSessionType] = useState<BookingType>("Jam");
  // Fully editable hourly rate in INR
  const [hourlyRate, setHourlyRate] = useState<number>(350);
  const [customRequests, setCustomRequests] = useState("");

  // Submission feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastLoggedBooking, setLastLoggedBooking] = useState<{ 
    id: string; 
    name: string; 
    amount: number; 
    hours: number; 
    date: string; 
    phone?: string;
    checkIn?: string;
    checkOut?: string;
  } | null>(null);

  const finalRate = hourlyRate;
  const totalAmount = Math.round(finalRate * hours);

  // Helper to get current local time formatted as HH:MM
  const getCurrentTimeHHMM = (): string => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Auto-calculate hours from arrival & departure
  const updateTimesAndDuration = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return;
    const [inH, inM] = inTime.split(":").map(Number);
    const [outH, outM] = outTime.split(":").map(Number);

    let inTotal = inH * 60 + inM;
    let outTotal = outH * 60 + outM;

    if (outTotal < inTotal) {
      // Crossed midnight
      outTotal += 24 * 60;
    }

    const diff = outTotal - inTotal;
    if (diff > 0) {
      const computed = Math.round((diff / 60) * 2) / 2;
      setHours(Math.max(0.5, Math.min(24, computed)));
    }
  };

  const handleSetCheckInNow = () => {
    const nowTime = getCurrentTimeHHMM();
    setCheckInTime(nowTime);
    if (checkOutTime) {
      updateTimesAndDuration(nowTime, checkOutTime);
    }
  };

  const handleSetCheckOutNow = () => {
    const nowTime = getCurrentTimeHHMM();
    setCheckOutTime(nowTime);
    if (checkInTime) {
      updateTimesAndDuration(checkInTime, nowTime);
    }
  };

  const handleAddHoursQuick = (additionalHours: number) => {
    const baseTime = checkInTime || getCurrentTimeHHMM();
    if (!checkInTime) setCheckInTime(baseTime);
    
    const [h, m] = baseTime.split(":").map(Number);
    const totalMin = (h + additionalHours) * 60 + m;
    const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
    const endM = String(totalMin % 60).padStart(2, "0");
    const calculatedOut = `${endH}:${endM}`;
    
    setCheckOutTime(calculatedOut);
    setHours(additionalHours);
  };

  const handleClearTimeLog = () => {
    setCheckInTime("");
    setCheckOutTime("");
    setHours(2);
  };

  const handleSessionTypeSelect = (type: BookingType) => {
    setSessionType(type);
    if (type === "Jam") setHourlyRate(350);
    else if (type === "Karaoke") setHourlyRate(400);
    else if (type === "Recording") setHourlyRate(600);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const trimmedName = clientName.trim();
      const trimmedPhone = phoneNumber.trim();
      const bookingId = "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      
      const computedSlot = checkInTime && checkOutTime
        ? `${checkInTime} - ${checkOutTime}`
        : `${hours}h Session`;

      const newBooking: Booking = {
        id: bookingId,
        clientName: trimmedName,
        phoneNumber: trimmedPhone || undefined,
        date,
        timeSlot: computedSlot,
        type: sessionType,
        defaultRate: finalRate,
        overrideRate: null,
        finalRate,
        hours,
        totalAmount,
        status: "Up Next",
        equipment: [],
        customRequests: customRequests.trim(),
        reminderSent: true,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        createdAt: new Date().toISOString()
      };

      onAddBooking(newBooking);

      // Trigger automatic confirmation receipt to client and dispatch alert to userEmail
      const clientEmail = `${trimmedName.replace(/\s+/g, "").toLowerCase()}@gmail.com`;
      const timeNoteLine = checkInTime || checkOutTime
        ? `\n⏱️ Timings: Arrival: ${checkInTime || "Not logged"} | Departure: ${checkOutTime || "Not logged"}`
        : "";

      const confirmationLog: EmailLog = {
        id: "email_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
        recipient: clientEmail,
        clientName: trimmedName,
        subject: `🎸 ${trimmedName} — Booking Confirmed (${sessionType}, ${hours} hrs @ ₹${finalRate}/hr)`,
        body: `Hi ${trimmedName},\n\nYour session has been successfully reserved and confirmed in the JAM JUNCTION Studio Schedule!\n\nClient / Band: ${trimmedName}\n${trimmedPhone ? `📞 Contact Phone: ${trimmedPhone}\n` : ""}📅 Date: ${date}${timeNoteLine}\n⏱️ Duration: ${hours} Hour${hours !== 1 ? "s" : ""}\n🎸 Session Specifics: ${sessionType} Session (${hours} Hrs @ ₹${finalRate}/hr)\n🎧 Total Bill: ₹${totalAmount}\n📝 Special Requests: ${customRequests.trim() || "None"}\n\n[DISPATCH ALERT: Copy delivered to supervisor ${userEmail}]\n\nRock on!`,
        type: "confirmation",
        timestamp: new Date().toISOString(),
        status: "sent",
        bookingId,
        hours,
        totalAmount
      };
      onSendEmailLog(confirmationLog);

      setIsSubmitting(false);
      setSubmitSuccess(true);
      setLastLoggedBooking({ 
        id: bookingId, 
        name: trimmedName, 
        amount: totalAmount, 
        hours,
        date,
        phone: trimmedPhone || undefined,
        checkIn: checkInTime || undefined,
        checkOut: checkOutTime || undefined,
      });

      // Reset form fields
      setClientName("");
      setPhoneNumber("");
      setCustomRequests("");
      setCheckInTime("");
      setCheckOutTime("");

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 9000);
    }, 450);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative z-10 p-1 md:p-3">
      
      {/* MAIN BOOKING CONSOLE */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300">
        
        {/* Subtle ambient cyber glow */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <Plus className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>NEW BOOKING</span>
                <span className="text-[10px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Live Entry
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Register soundcheck, rehearsal, and recording sessions with automated INR billing
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. CLIENT / BAND NAME */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5 font-mono">
              Client / Band Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Iron Maidens, The Red Velvet Band, Djent Project, Aakash Quartet"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white border input-interactive placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* 2. PHONE NUMBER SECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-cyan-400" />
                <span>Phone Number</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Contact / WhatsApp alerts</span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400 pointer-events-none" />
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210 or 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white border input-interactive placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* 3. CALENDAR DATE */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5 font-mono">
              Session Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400 pointer-events-none" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white border input-interactive cursor-pointer font-mono"
              />
            </div>
          </div>

          {/* 4. TIME NOTING SYSTEM: AT WHAT TIME DID THEY COME & WHAT TIME DID THEY LEAVE */}
          <div className="p-4 md:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-20 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/15 pb-3">
              <div>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>Time Noting System (Arrival & Departure)</span>
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Record exact client entry & exit time. Duration will automatically compute below.
                </span>
              </div>

              {(checkInTime || checkOutTime) && (
                <button
                  type="button"
                  onClick={handleClearTimeLog}
                  className="self-start sm:self-auto text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Times</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ARRIVAL TIME (COME IN) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <LogIn className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Arrival Time (Entry)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCheckInNow}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer"
                    title="Stamp current time"
                  >
                    Stamp Now
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      setCheckInTime(newIn);
                      if (checkOutTime) {
                        updateTimesAndDuration(newIn, checkOutTime);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono text-white border input-interactive bg-black/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* DEPARTURE TIME (LEAVE) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <LogOut className="h-3.5 w-3.5 text-rose-400" />
                    <span>Departure Time (Exit)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCheckOutNow}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 transition-all cursor-pointer"
                    title="Stamp current time"
                  >
                    Stamp Now
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => {
                      const newOut = e.target.value;
                      setCheckOutTime(newOut);
                      if (checkInTime) {
                        updateTimesAndDuration(checkInTime, newOut);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono text-white border input-interactive bg-black/40 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Session Interval Adders */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mr-1">
                Quick End Shortcuts:
              </span>
              {[1, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleAddHoursQuick(h)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                >
                  +{h}h from arrival
                </button>
              ))}
            </div>

            {/* Time Note Live Feedback Pill */}
            {checkInTime && checkOutTime && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs font-mono text-cyan-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Logged Session: {checkInTime} → {checkOutTime}</span>
                </span>
                <span className="font-bold text-white px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">
                  {hours} Hour{hours !== 1 ? "s" : ""} Computed
                </span>
              </div>
            )}
          </div>

          {/* 6. SESSION MODE & EDITABLE HOURLY RATE ROW (INR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5 font-mono">
                Session Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Jam", "Karaoke", "Recording"] as BookingType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSessionTypeSelect(type)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 border ${
                      sessionType === type
                        ? type === "Jam"
                          ? "bg-cyan-600/25 border-cyan-400 text-white shadow-lg shadow-cyan-600/20"
                          : type === "Karaoke"
                          ? "bg-indigo-600/25 border-indigo-400 text-white shadow-lg shadow-indigo-600/20"
                          : "bg-teal-600/25 border-teal-400 text-white shadow-lg shadow-teal-600/20"
                        : "bg-black/30 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {type === "Jam" && <Music className="h-4 w-4 text-cyan-400" />}
                    {type === "Karaoke" && <Mic2 className="h-4 w-4 text-indigo-400" />}
                    {type === "Recording" && <FileAudio className="h-4 w-4 text-teal-400" />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FULL KEYBOARD RATE INPUT IN INDIAN RUPEES */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">
                  Hourly Rate (₹/hr) *
                </label>
                <span className="text-[10px] text-cyan-300 font-mono">Type any custom price</span>
              </div>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  step={25}
                  value={hourlyRate === 0 ? "" : hourlyRate}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setHourlyRate(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full pl-10 pr-14 py-3 rounded-xl text-sm text-white font-mono font-bold border input-interactive bg-black/50 focus:outline-none focus:border-cyan-400"
                  placeholder="Type price..."
                />
                <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400 pointer-events-none">₹/hr</span>
              </div>
              
              {/* Quick rate shortcut chips in INR */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono mr-1">Presets:</span>
                {[300, 350, 400, 500, 600, 800].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setHourlyRate(amt)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border cursor-pointer transition-all ${
                      hourlyRate === amt
                        ? "bg-cyan-600 border-cyan-400 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 7. SPECIAL REQUESTS */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5 font-mono">
              Special Requests / Gear Notes
            </label>
            <textarea
              placeholder="e.g. Extra mic stand, setup drum riser, key card access, vocal monitor mix..."
              value={customRequests}
              onChange={(e) => setCustomRequests(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white border input-interactive placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* 8. LIVE BILL CALCULATION & SUBMISSION ACTION (CONFIRM BOOKING) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-black/50 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="text-left w-full sm:w-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                Calculated Total Bill ({hours} hrs @ ₹{finalRate}/hr)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-indigo-300 font-mono">
                  ₹{totalAmount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  {sessionType} Session
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto cursor-pointer bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-xl shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Confirming Booking...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* SUCCESS CONFIRMATION BANNER */}
        {submitSuccess && lastLoggedBooking && (
          <div className="mt-5 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn text-emerald-300 text-xs text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  <span>Booking Confirmed:</span>
                  <span className="text-cyan-300 underline font-black">{lastLoggedBooking.name}</span>
                </p>
                <p className="text-[11px] text-emerald-300/90 font-mono mt-0.5">
                  📅 {lastLoggedBooking.date} {lastLoggedBooking.checkIn && lastLoggedBooking.checkOut ? `• ⏱️ ${lastLoggedBooking.checkIn} - ${lastLoggedBooking.checkOut} ` : ""}• {lastLoggedBooking.hours} hours • ₹{lastLoggedBooking.amount.toLocaleString()} billed {lastLoggedBooking.phone ? `• 📞 ${lastLoggedBooking.phone} ` : ""}• Saved to schedule.
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateTab("schedule")}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-cyan-600/30 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>View Live Schedule</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}

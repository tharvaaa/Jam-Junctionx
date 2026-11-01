/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Booking, BookingStatus, BookingType, EmailLog } from "../types";
import { 
  Calendar, Search, Trash2, Check,
  Music, AlertCircle, Clock, Mic2, FileAudio, Filter,
  Sparkles, Layers, Phone, Radio, IndianRupee, Mail,
  LogIn, LogOut
} from "lucide-react";
import LiveCountdown from "./LiveCountdown";
import LogTimeline from "./LogTimeline";

interface DailyScheduleProps {
  bookings: Booking[];
  emailLogs?: EmailLog[];
  onUpdateBookingStatus: (id: string, newStatus: BookingStatus, updates?: Partial<Booking>) => void;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
  onDeleteBooking: (id: string) => void;
  onClearAllBookings?: () => void;
  onSendEmailLog?: (log: EmailLog) => void;
  supervisorEmail?: string;
  onClearAllLogs?: () => void;
}

export default function DailySchedule({ 
  bookings, 
  emailLogs = [],
  onUpdateBookingStatus, 
  onUpdateBooking, 
  onDeleteBooking, 
  onClearAllBookings,
  onSendEmailLog,
  supervisorEmail = "narkhedeatharva2106@gmail.com",
  onClearAllLogs
}: DailyScheduleProps) {
  // Main view segment within Live Schedule: "sessions" or "timeline"
  const [scheduleView, setScheduleView] = useState<"sessions" | "timeline">("sessions");

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Today's real local ISO date string
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Calendar Filter state: default to "all" so newly locked bookings immediately appear in the timeline!
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("All");

  // Format date helper for header view
  const formatDateFriendly = (dateStr: string) => {
    if (dateStr === "all") return "All Sessions";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Collect unique dates from actual bookings
  const bookingDates = useMemo(() => {
    const dates = new Set<string>();
    bookings.forEach(b => {
      if (b.date) dates.add(b.date);
    });
    return Array.from(dates).sort().reverse();
  }, [bookings]);

  // Filtered Bookings list
  const filteredBookings = bookings.filter((b) => {
    const matchesDate = selectedDate === "all" || b.date === selectedDate;
    const matchesSearch = 
      b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (b.phoneNumber && b.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.equipment && b.equipment.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (b.customRequests && b.customRequests.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedTypeFilter === "All" || b.type === selectedTypeFilter;
    
    return matchesDate && matchesSearch && matchesType;
  });

  // Sort bookings: newest/upcoming sessions first
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (selectedDate === "all") {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "Live Now":
        return "bg-rose-500/20 border-rose-500/50 text-rose-300";
      case "Up Next":
        return "bg-amber-500/20 border-amber-500/40 text-amber-300";
      case "Completed":
        return "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
      case "Cancelled":
        return "bg-slate-500/20 border-slate-500/30 text-slate-400";
    }
  };

  const getSessionTypeIcon = (type: BookingType) => {
    switch (type) {
      case "Jam":
        return <Music className="h-4 w-4 text-cyan-400" />;
      case "Karaoke":
        return <Mic2 className="h-4 w-4 text-indigo-400" />;
      case "Recording":
        return <FileAudio className="h-4 w-4 text-teal-400" />;
    }
  };

  // Helper to check if a booking was created within the last 15 minutes
  const isJustLocked = (createdAt?: string) => {
    if (!createdAt) return false;
    try {
      const createdTime = new Date(createdAt).getTime();
      return Date.now() - createdTime < 15 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const ongoingBookings = bookings.filter((b) => b.status === "Live Now");

  return (
    <div className="space-y-6 relative z-10 p-1 md:p-3">
      
      {/* INTEGRATED VIEW SELECTOR: SESSIONS VS DISPATCH LOG TIMELINE */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-black/50 border border-cyan-500/25 shadow-lg shadow-cyan-950/20 gap-2">
          <button
            type="button"
            onClick={() => setScheduleView("sessions")}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              scheduleView === "sessions"
                ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="h-4 w-4 text-cyan-300" />
            <span>Sessions & Schedule</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 border border-white/10 text-cyan-200">
              {bookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScheduleView("timeline")}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              scheduleView === "timeline"
                ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Mail className="h-4 w-4 text-indigo-300" />
            <span>Dispatch & Log Timeline</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/40 border border-white/10 text-indigo-200">
              {emailLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* RENDER CHOSEN VIEW */}
      {scheduleView === "timeline" ? (
        <div className="animate-fadeIn">
          <LogTimeline 
            emailLogs={emailLogs}
            bookings={bookings}
            onSendEmailLog={onSendEmailLog || (() => {})}
            supervisorEmail={supervisorEmail}
            onClearAllLogs={onClearAllLogs || (() => {})}
            onUpdateBookingStatus={onUpdateBookingStatus}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          
          {/* FILTER STICKY RAIL COMPONENT */}
          <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              
              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setSelectedDate("all")}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                    selectedDate === "all"
                      ? "bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/30 scale-105"
                      : "bg-black/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>All Sessions ({bookings.length})</span>
                </button>

                <button
                  onClick={() => setSelectedDate(todayDateStr)}
                  className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                    selectedDate === todayDateStr
                      ? "bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/30"
                      : "bg-black/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                  }`}
                >
                  Today
                </button>

                {bookingDates.slice(0, 3).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`text-xs font-mono font-semibold px-3 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      selectedDate === d
                        ? "bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30"
                        : "bg-black/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Date Picker & Clear All Sessions Action */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Filter Date:</span>
                  <input
                    type="date"
                    value={selectedDate === "all" ? "" : selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value || "all")}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer text-xs"
                  />
                  {selectedDate !== "all" && (
                    <button
                      onClick={() => setSelectedDate("all")}
                      className="text-[10px] text-cyan-300 hover:underline uppercase font-bold"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {onClearAllBookings && (
                  showClearConfirm ? (
                    <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/50 p-1 rounded-xl animate-fadeIn">
                      <span className="text-[10px] text-red-200 font-bold px-1">Clear all sessions?</span>
                      <button
                        onClick={() => {
                          onClearAllBookings();
                          setShowClearConfirm(false);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
                      >
                        Yes, Clear
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      disabled={bookings.length === 0}
                      className="cursor-pointer bg-red-950/20 hover:bg-red-900/30 text-red-300 hover:text-white border border-red-500/30 px-2.5 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Clear all scheduled sessions"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear All</span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-white/5">
              {/* Search bar */}
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by client/band name, phone, requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs text-white border input-interactive placeholder-slate-600 focus:outline-none pointer-events-auto"
                />
              </div>

              {/* Type Filter Tabs */}
              <div className="md:col-span-4 flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                {["All", "Jam", "Karaoke", "Recording"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      selectedTypeFilter === type
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-1.5 text-[11px] font-mono text-slate-400 bg-black/20 px-3 py-2 rounded-xl border border-white/5">
                <Filter className="h-3.5 w-3.5 text-cyan-400" />
                <span>Showing: <strong className="text-cyan-300 font-bold">{sortedBookings.length}</strong></span>
              </div>
            </div>
          </div>

          {/* ONGOING LIVE SESSIONS SECTION (WITH LIVE COUNTDOWN OF TIME LEFT) */}
          {ongoingBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <h3 className="text-xs font-black tracking-widest uppercase text-rose-400 font-mono flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                  <span>Ongoing Live Sessions ({ongoingBookings.length}) — Live Countdown</span>
                </h3>
              </div>

              <div className="space-y-3">
                {ongoingBookings.map((b) => (
                  <div key={`live-active-${b.id}`} className="glass-panel rounded-2xl p-5 border border-rose-500/40 bg-rose-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-rose-500/20">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded border border-rose-500/30 uppercase">
                          {b.type} Session
                        </span>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">{b.clientName}</h4>
                      </div>
                      {b.phoneNumber && (
                        <a
                          href={`tel:${b.phoneNumber}`}
                          className="text-xs font-mono font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-xl border border-emerald-500/40"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{b.phoneNumber}</span>
                        </a>
                      )}
                    </div>

                    <LiveCountdown 
                      booking={b} 
                      onUpdateBookingStatus={onUpdateBookingStatus} 
                      onUpdateBooking={onUpdateBooking} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCHEDULE SESSIONS LIST */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-cyan-400 rounded-full animate-ping" />
                <h3 className="text-sm font-bold tracking-wider uppercase text-slate-300 font-sans">
                  Schedule Sessions — {formatDateFriendly(selectedDate)}
                </h3>
              </div>
            </div>

            {sortedBookings.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center pointer-events-auto">
                <AlertCircle className="h-10 w-10 text-cyan-400/60 mx-auto mb-3" />
                <p className="text-sm text-slate-300 font-bold">No sessions found for this filter</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click <strong className="text-cyan-400 cursor-pointer" onClick={() => setSelectedDate("all")}>"All Sessions"</strong> above, or add a new booking in the BOOKING tab.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBookings.map((booking) => {
                  const justLocked = isJustLocked(booking.createdAt);
                  const isLive = booking.status === "Live Now";

                  return (
                    <div
                      key={booking.id}
                      id={`booking-card-${booking.id}`}
                      className={`glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border pointer-events-auto transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/15 ${
                        isLive 
                          ? "border-rose-500/60 bg-rose-950/20 shadow-xl shadow-rose-500/15" 
                          : justLocked 
                          ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-500/10" 
                          : "border-white/5"
                      }`}
                    >
                      {/* Main Session Identity info */}
                      <div className="space-y-3 flex-1 w-full">
                        
                        {/* Top Tag Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {justLocked && (
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-cyan-500/20 animate-pulse">
                              <Sparkles className="h-3 w-3" /> Confirmed Just Now
                            </span>
                          )}

                          <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 flex items-center gap-1.5">
                            {getSessionTypeIcon(booking.type)}
                            <span className="text-xs font-semibold text-white uppercase tracking-wider">{booking.type}</span>
                          </div>

                          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                            <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                            <span>{booking.date}</span>
                          </span>

                          <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-cyan-500/20">
                            <Clock className="h-3.5 w-3.5 text-cyan-400" />
                            <span>{booking.hours} hrs</span>
                            {booking.timeSlot && !booking.timeSlot.includes("Session") && (
                              <span className="text-[10px] text-slate-400">({booking.timeSlot})</span>
                            )}
                          </span>

                          {/* EXACT ARRIVAL & DEPARTURE TIME BADGES IF RECORDED */}
                          {booking.checkInTime && (
                            <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1 bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-500/30" title="Client Arrival Time">
                              <LogIn className="h-3 w-3 text-emerald-400" />
                              <span>In: {booking.checkInTime}</span>
                            </span>
                          )}
                          {booking.checkOutTime && (
                            <span className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1 bg-rose-950/30 px-2.5 py-1 rounded-md border border-rose-500/30" title="Client Departure Time">
                              <LogOut className="h-3 w-3 text-rose-400" />
                              <span>Out: {booking.checkOutTime}</span>
                            </span>
                          )}

                          {/* CLIENT MOBILE NUMBER BADGE */}
                          {booking.phoneNumber ? (
                            <a
                              href={`tel:${booking.phoneNumber}`}
                              className="text-xs font-mono font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-500/40 transition-colors"
                              title="Click to dial client"
                            >
                              <Phone className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{booking.phoneNumber}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500 bg-black/30 px-2 py-0.5 rounded">
                              No phone
                            </span>
                          )}

                          <span className={`text-[10px] uppercase tracking-widest font-bold py-0.5 px-2.5 border rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>

                        {/* PROMINENT CLIENT / BAND NAME & PHONE */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[10px] uppercase tracking-widest font-mono font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              BAND / CLIENT
                            </span>
                            <h4 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                              {booking.clientName}
                            </h4>
                          </div>

                          {/* Prominent Client Mobile details bar */}
                          {booking.phoneNumber && (
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-[11px] font-mono text-slate-400">Client Mobile:</span>
                              <a
                                href={`tel:${booking.phoneNumber}`}
                                className="text-xs font-mono font-bold text-emerald-300 hover:underline flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3 text-emerald-400" />
                                <span>{booking.phoneNumber}</span>
                              </a>
                            </div>
                          )}

                          {booking.customRequests && (
                            <p className="text-xs text-slate-400 font-sans mt-1 bg-black/30 p-2.5 rounded-xl border border-white/5">
                              <strong className="text-cyan-300 font-sans text-[10px] uppercase tracking-widest not-italic block mb-0.5">Special Requests</strong>
                              "{booking.customRequests}"
                            </p>
                          )}
                        </div>

                        {/* LIVE COUNTDOWN FOR ONGOING BOOKING */}
                        {isLive && (
                          <div className="mt-2 pt-2 border-t border-rose-500/20">
                            <LiveCountdown 
                              booking={booking} 
                              onUpdateBookingStatus={onUpdateBookingStatus} 
                              onUpdateBooking={onUpdateBooking} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Price Summary, Status Toggle, and Delete Action Row in INR */}
                      <div className="w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
                        
                        <div className="text-left md:text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Total Bill (INR)</span>
                          <span className="text-2xl font-black font-mono text-white block">
                            ₹{booking.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            (₹{booking.finalRate}/hr x {booking.hours} hrs)
                          </span>
                        </div>

                        {/* Status update selector & Trash */}
                        <div className="flex items-center gap-2">
                          
                          {/* Live update status toggler */}
                          <div className="flex items-center gap-1">
                            {booking.status !== "Completed" && booking.status !== "Cancelled" && (
                              <button
                                title="Advance Status"
                                onClick={() => {
                                  const next = booking.status === "Up Next" ? "Live Now" : "Completed";
                                  onUpdateBookingStatus(booking.id, next);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 transition duration-300 cursor-pointer"
                              >
                                {booking.status === "Up Next" ? "Go Live 🟢" : "Complete ✓"}
                              </button>
                            )}

                            {booking.status === "Completed" && (
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1 select-none font-mono">
                                <Check className="h-3 w-3" /> Settled
                              </span>
                            )}

                            {booking.status === "Cancelled" && (
                              <span className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded select-none font-mono">
                                Cancelled
                              </span>
                            )}
                          </div>

                          <button
                            title="Remove session"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${booking.clientName} from the schedule?`)) {
                                onDeleteBooking(booking.id);
                              }
                            }}
                            className="p-2 rounded-xl bg-red-950/20 border border-red-500/10 hover:border-red-500/50 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition duration-300 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

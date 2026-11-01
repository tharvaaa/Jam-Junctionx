/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { EmailLog, Booking } from "../types";
import { 
  Mail, Clock, CheckCircle2, Search, 
  Send, RefreshCw, AlertCircle, Copy, Check,
  ChevronDown, ChevronUp, Music, Trash2, IndianRupee,
  Phone, Radio
} from "lucide-react";
import LiveCountdown from "./LiveCountdown";

interface LogTimelineProps {
  emailLogs: EmailLog[];
  bookings?: Booking[];
  onSendEmailLog: (log: EmailLog) => void;
  supervisorEmail: string;
  onClearAllLogs: () => void;
  onUpdateBookingStatus?: (id: string, newStatus: any, updates?: Partial<Booking>) => void;
}

export default function LogTimeline({ 
  emailLogs, 
  bookings = [], 
  onSendEmailLog, 
  supervisorEmail, 
  onClearAllLogs,
  onUpdateBookingStatus 
}: LogTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Helper to resolve client name from log or parse from subject/body
  const getLogClientName = (log: EmailLog): string | null => {
    if (log.clientName && log.clientName.trim()) return log.clientName.trim();
    
    // Pattern: "🎸 ClientName — Booking Confirmed" or "🎸 ClientName —"
    const matchEmoji = log.subject.match(/🎸\s*([^—–-]+?)\s*[—–-]/);
    if (matchEmoji && matchEmoji[1]) return matchEmoji[1].trim();

    // Pattern: "(ClientName)" in subject
    const matchParen = log.subject.match(/\(([^)]+)\)/);
    if (matchParen && matchParen[1]) return matchParen[1].trim();

    // Pattern in body: "Client / Band: ClientName" or "Hi ClientName,"
    const matchBodyName = log.body.match(/Client \/ (?:Band|Band Name):\s*([^\n\r]+)/);
    if (matchBodyName && matchBodyName[1]) return matchBodyName[1].trim();

    const matchHi = log.body.match(/Hi\s+([^\n\r,]+),/);
    if (matchHi && matchHi[1]) return matchHi[1].trim();

    return null;
  };

  // Helper to resolve client mobile phone number from log, body or bookings
  const getLogPhoneNumber = (log: EmailLog): string | null => {
    if (log.phoneNumber && log.phoneNumber.trim()) return log.phoneNumber.trim();

    // Cross reference with bookings state if available
    if (bookings && bookings.length > 0) {
      if (log.bookingId) {
        const found = bookings.find(b => b.id === log.bookingId);
        if (found?.phoneNumber) return found.phoneNumber;
      }
      const clientName = getLogClientName(log);
      if (clientName) {
        const found = bookings.find(
          b => b.clientName.toLowerCase() === clientName.toLowerCase() && b.phoneNumber
        );
        if (found?.phoneNumber) return found.phoneNumber;
      }
    }

    // Pattern in body: "📞 Contact Phone: ..." or "📞 Phone Number: ..."
    const matchBodyPhone = log.body.match(/📞\s*(?:Contact Phone|Phone Number)?:\s*([+\d\s-]{8,20})/);
    if (matchBodyPhone && matchBodyPhone[1]) return matchBodyPhone[1].trim();

    return null;
  };

  // Helper to extract amount paid from log
  const getLogAmountPaid = (log: EmailLog): string | null => {
    if (log.totalAmount !== undefined && log.totalAmount !== null) {
      return `₹${log.totalAmount.toLocaleString()}`;
    }
    const matchBody = log.body.match(/Total Bill:\s*₹?([0-9,]+)/i);
    if (matchBody && matchBody[1]) return `₹${matchBody[1]}`;
    
    const matchSubject = log.subject.match(/₹([0-9,]+)/);
    if (matchSubject && matchSubject[1]) return `₹${matchSubject[1]}`;
    
    return null;
  };

  // Filtered logs
  const filteredLogs = emailLogs.filter((log) => {
    const matchesType = typeFilter === "All" || log.type === typeFilter.toLowerCase();
    const resolvedName = getLogClientName(log) || "";
    const phone = getLogPhoneNumber(log) || "";
    const matchesSearch = 
      resolvedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDispatchTestAlert = () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    setTestSentMessage(null);

    setTimeout(() => {
      const testLog: EmailLog = {
        id: "test_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
        recipient: supervisorEmail,
        clientName: "System Alert",
        subject: `⚡ JAM JUNCTION - Test Alert Signal [${new Date().toLocaleTimeString()}]`,
        body: `Test signal verified for studio supervisor ${supervisorEmail}.\n\nClient / Band Name: System Diagnostic Verification\nTimestamp: ${new Date().toISOString()}\nStatus: Verified`,
        type: "reminder",
        timestamp: new Date().toISOString(),
        status: "sent"
      };

      onSendEmailLog(testLog);
      setIsSendingTest(false);
      setTestSentMessage(`✓ Test dispatch alert logged`);
      setTimeout(() => setTestSentMessage(null), 4000);
    }, 800);
  };

  const totalConfirmations = emailLogs.filter(l => l.type === "confirmation").length;
  const totalReminders = emailLogs.filter(l => l.type === "reminder").length;
  const totalReports = emailLogs.filter(l => l.type === "report").length;

  const ongoingBookings = bookings.filter((b) => b.status === "Live Now");

  return (
    <div className="space-y-6 relative z-10">
      
      {/* HEADER & SUMMARY BAR */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <Mail className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Dispatch & Activity Timeline</h2>
              <span className="text-[10px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                Audit Stream
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Chronological log stream of band sessions, client contacts, INR payments, and booking notifications
            </p>
          </div>
        </div>

        {/* Action buttons: Clear All & Dispatch Test */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/50 p-1.5 rounded-xl animate-fadeIn">
              <span className="text-[11px] text-red-200 font-bold px-1.5">Clear all logs?</span>
              <button
                onClick={() => {
                  onClearAllLogs();
                  setShowClearConfirm(false);
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={emailLogs.length === 0}
              className="cursor-pointer bg-red-950/30 hover:bg-red-900/40 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500/60 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear all logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All Logs</span>
            </button>
          )}

          <button
            onClick={handleDispatchTestAlert}
            disabled={isSendingTest}
            className="flex-1 md:flex-none cursor-pointer bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all duration-300 hover:scale-[1.02]"
          >
            {isSendingTest ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Dispatch Test Alert</span>
              </>
            )}
          </button>
        </div>
      </div>

      {testSentMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{testSentMessage}</span>
        </div>
      )}

      {/* ONGOING LIVE SESSIONS SECTION (LIVE COUNTDOWN IN TIMELINE) */}
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
              <div key={`timeline-live-${b.id}`} className="glass-panel rounded-2xl p-5 border border-rose-500/40 bg-rose-950/20">
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
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & METRICS COUNTER BAR */}
      <div className="glass-panel rounded-2xl p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">Total Logs</span>
            <span className="text-xl font-bold font-mono text-white">{emailLogs.length}</span>
          </div>
          <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono block">Confirmations</span>
            <span className="text-xl font-bold font-mono text-cyan-300">{totalConfirmations}</span>
          </div>
          <div className="bg-black/40 border border-indigo-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-mono block">Reminders</span>
            <span className="text-xl font-bold font-mono text-indigo-300">{totalReminders}</span>
          </div>
          <div className="bg-black/40 border border-teal-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-mono block">Statements</span>
            <span className="text-xl font-bold font-mono text-teal-300">{totalReports}</span>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-white/5">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search timeline by client name, mobile phone, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs text-white border input-interactive placeholder-slate-600 focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto">
            {["All", "Confirmation", "Reminder", "Report"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                  typeFilter === type
                    ? "bg-cyan-600 border border-cyan-400 text-white shadow-md shadow-cyan-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOG STREAM LIST */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <AlertCircle className="h-10 w-10 text-cyan-400/60 mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-bold">No dispatch logs match your query</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Confirm a new session in the BOOKING tab to see real-time dispatch alerts streamed here.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const clientName = getLogClientName(log);
            const phoneNumber = getLogPhoneNumber(log);
            const amountPaid = getLogAmountPaid(log);

            const dateObj = new Date(log.timestamp);
            const timeFormatted = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
            const dateFormatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const timingFormatted = `${dateFormatted} at ${timeFormatted}`;

            return (
              <div 
                key={log.id} 
                className={`glass-panel rounded-2xl p-5 md:p-6 border transition-all duration-300 hover:-translate-y-1 ${
                  log.type === "confirmation"
                    ? "border-cyan-500/25 bg-cyan-950/10 hover:border-cyan-500/40"
                    : log.type === "report"
                    ? "border-teal-500/25 bg-teal-950/10 hover:border-teal-500/40"
                    : "border-indigo-500/25 bg-indigo-950/10 hover:border-indigo-500/40"
                }`}
              >
                {/* Header row with Badge, Timestamp, and Mobile Dial link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      log.type === "confirmation"
                        ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                        : log.type === "report"
                        ? "bg-teal-500/15 border-teal-500/30 text-teal-300"
                        : "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                    }`}>
                      {log.type}
                    </span>

                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{timingFormatted}</span>
                    </span>

                    {/* STATUS BADGE */}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Delivered</span>
                    </span>
                  </div>

                  {/* Right Header: Client Mobile */}
                  {phoneNumber && (
                    <a
                      href={`tel:${phoneNumber.replace(/[^\d+]/g, "")}`}
                      className="text-xs font-mono font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/40 transition-colors w-fit"
                      title="Click to dial client"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{phoneNumber}</span>
                    </a>
                  )}
                </div>

                {/* Primary Identity: Client Name & Subject */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div className="space-y-1">
                    {clientName && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Music className="h-3 w-3 text-cyan-400" />
                          <span>BAND / CLIENT</span>
                        </span>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                          {clientName}
                        </h3>
                      </div>
                    )}
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <span>{log.subject}</span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(log.id, `${log.subject}\n\n${log.body}`)}
                      className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
                      title="Copy dispatch transcript"
                    >
                      {copiedId === log.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedId === log.id ? "Copied" : "Copy"}</span>
                    </button>

                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-500/30 transition-colors flex items-center gap-1 cursor-pointer font-mono font-bold"
                    >
                      <span className="text-[10px] font-mono">{isExpanded ? "Less" : "Details"}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* ESSENTIAL STATS ROW: HOW MUCH PAID (IN INR), TIMINGS, AND CLIENT MOBILE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                  {/* HOW MUCH PAID */}
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <IndianRupee className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">Amount Paid</span>
                      <span className="text-base font-black font-mono text-emerald-300">
                        {amountPaid || "Recorded"}
                      </span>
                    </div>
                  </div>

                  {/* TIMINGS */}
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">Timings & Duration</span>
                      <span className="text-xs font-bold font-mono text-cyan-200">
                        {log.hours ? `${log.hours} Hour${log.hours !== 1 ? "s" : ""} Session` : timingFormatted}
                      </span>
                    </div>
                  </div>

                  {/* CLIENT MOBILE NUMBER */}
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-teal-400" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">Client Mobile</span>
                      {phoneNumber ? (
                        <a 
                          href={`tel:${phoneNumber.replace(/[^\d+]/g, "")}`}
                          className="text-xs font-mono font-bold text-teal-300 hover:underline block"
                        >
                          {phoneNumber}
                        </a>
                      ) : (
                        <span className="text-xs font-mono text-slate-500">Not recorded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* EXPANDED FULL BODY LOG TRANSCRIPT */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10 animate-fadeIn space-y-3">
                    <div className="bg-black/60 rounded-xl p-4 border border-white/10 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {log.body}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1">
                      <span>Recipient: <strong className="text-white">{log.recipient}</strong></span>
                      <span>Log Reference: <code className="text-cyan-400">{log.id}</code></span>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

// @ts-nocheck — vendored design drop-in (loosely typed). Data is wired live via
// the `data` prop from getExecutiveData(); the mock constants have been removed.
/* eslint-disable */
"use client";
/**
 * PQT — Executive Dashboard (Super Admin / CEO view)
 * ---------------------------------------------------
 * A read-only, "single-screen picture of the whole CRM" — like a Google
 * Analytics overview, built for the PQT brand.
 *
 * WHAT THIS IS
 *   - One self-contained React component. Drop it into the CRM as a page
 *     (e.g. /dashboard/executive). It styles itself (scoped CSS in a <style>
 *     tag) so it does not depend on your CRM's CSS setup.
 *   - It renders inside your existing CRM shell (the red sidebar + top search
 *     bar are already provided by the CRM layout — this is just the page body).
 *
 * DATA
 *   - Every number is live, supplied by `getExecutiveData()` via the `data`
 *     prop: KPI datasets, per-range leaderboard, daily trend series, source
 *     split, nationalities, needs-attention and the per-agent activity log.
 *   - The AI summary + chat route through the CRM's configured provider
 *     (Settings → AI); the summary falls back to a real, computed digest.
 *
 * LIBRARIES (already in this preview; standard in a Next.js app)
 *   - recharts        (charts)        npm i recharts
 *   - lucide-react    (icons)         npm i lucide-react
 *   In production, swap lucide-react for @tabler/icons-react to match the CRM.
 */

import React, { useState, useMemo, useEffect } from "react";
import { getExecutiveSummary, askExecutive } from "@/lib/actions/executive";
import { UserKpiReport } from "./user-kpi-report";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Sparkles,
  RefreshCw,
  Inbox,
  Target,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Phone,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Clock,
  ChevronDown,
  Mail,
  MessageSquare,
  StickyNote,
  Send,
  Search,
  LogIn,
  Activity,
} from "lucide-react";

/* ============================================================================
   DESIGN TOKENS + SCOPED STYLES
   Everything is namespaced under .pqt-exec so it can't leak into the CRM.
   ========================================================================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

.pqt-exec{
  --brand:#E5202E; --brand-d:#C41A26; --brand-50:#FEF2F3; --brand-100:#FCE3E4;
  --ink:#0F172A; --ink-2:#334155; --ink-3:#64748B; --ink-4:#94A3B8;
  --line:#ECEEF2; --line-2:#E2E6EC;
  --bg:#F6F7F9; --card:#FFFFFF; --hover:#F8FAFC;
  --green:#15A34A; --green-50:#ECFDF3;
  --amber:#D97706; --amber-50:#FFF7ED;
  --blue:#2563EB; --blue-50:#EFF5FF;
  --violet:#7C3AED; --violet-50:#F5F1FE;
  --teal:#0D9488; --teal-50:#EFFCFA;
  --radius:14px; --radius-sm:10px; --radius-xs:8px;
  --shadow:0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.04);
  --mono:'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans:'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;

  font-family:var(--sans); color:var(--ink); background:var(--bg);
  min-height:100%; padding:24px 28px 48px; box-sizing:border-box;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.pqt-exec *{ box-sizing:border-box; }
.pqt-exec .mono{ font-family:var(--mono); font-variant-numeric:tabular-nums; }

/* ---- page header ---- */
.pe-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
.pe-title{ font-size:24px; font-weight:700; letter-spacing:-.02em; margin:0; }
.pe-sub{ font-size:13.5px; color:var(--ink-3); margin:4px 0 0; }
.pe-range-resolved{ display:inline-flex; align-items:center; gap:6px; margin-top:8px; font-size:12px; color:var(--ink-3); }
.pe-range-resolved .mono{ color:var(--ink-2); }

.pe-head-right{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

/* segmented date control */
.seg{ display:inline-flex; background:var(--card); border:1px solid var(--line-2); border-radius:10px; padding:3px; box-shadow:var(--shadow); }
.seg button{ border:0; background:transparent; font:inherit; font-size:12.5px; font-weight:500; color:var(--ink-3);
  padding:6px 12px; border-radius:7px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.seg button:hover{ color:var(--ink); }
.seg button.on{ background:var(--brand); color:#fff; box-shadow:0 1px 2px rgba(229,32,46,.35); }

.date-pop{ display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--line-2);
  border-radius:10px; padding:6px 8px; box-shadow:var(--shadow); }
.date-pop input{ font:inherit; font-size:12.5px; color:var(--ink); border:0; background:var(--hover);
  border-radius:7px; padding:6px 8px; outline:none; }
.date-pop input:focus{ box-shadow:0 0 0 2px var(--brand-100); }
.date-pop span{ color:var(--ink-4); font-size:12px; }

.icon-btn{ display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:10px;
  border:1px solid var(--line-2); background:var(--card); color:var(--ink-3); cursor:pointer; box-shadow:var(--shadow); transition:all .15s; }
.icon-btn:hover{ color:var(--ink); background:var(--hover); }
.spin{ animation:spin .8s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }

/* ---- generic card ---- */
.card{ background:var(--card); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow); }
.card-pad{ padding:20px; }
.card-h{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:2px; }
.card-t{ font-size:14.5px; font-weight:650; letter-spacing:-.01em; margin:0; }
.card-d{ font-size:12px; color:var(--ink-3); margin:2px 0 0; }

/* ---- AI summary ---- */
.ai{ position:relative; overflow:hidden; border:1px solid var(--line); }
.ai::before{ content:''; position:absolute; inset:0;
  background:radial-gradient(120% 140% at 100% 0%, rgba(229,32,46,.06) 0%, rgba(229,32,46,0) 42%); pointer-events:none; }
.ai-bar{ position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(180deg,var(--brand),#FB6B73); }
.ai-pad{ padding:18px 22px 20px 24px; position:relative; }
.ai-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.ai-badge{ display:inline-flex; align-items:center; gap:8px; }
.ai-spark{ width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center;
  background:var(--brand-50); color:var(--brand); }
.ai-label{ font-size:13.5px; font-weight:650; }
.ai-pill{ font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:.03em; text-transform:uppercase;
  color:var(--ink-3); background:var(--hover); border:1px solid var(--line-2); padding:2px 7px; border-radius:999px; }
.ai-meta{ display:flex; align-items:center; gap:10px; }
.ai-stamp{ font-size:11.5px; color:var(--ink-4); display:inline-flex; align-items:center; gap:5px; }
.ai-regen{ display:inline-flex; align-items:center; gap:6px; font:inherit; font-size:12px; font-weight:550; cursor:pointer;
  color:var(--brand); background:var(--brand-50); border:1px solid var(--brand-100); border-radius:8px; padding:6px 11px; transition:all .15s; }
.ai-regen:hover{ background:#fce0e2; }
.ai-regen:disabled{ opacity:.55; cursor:default; }
.ai-headline{ font-size:17px; font-weight:650; letter-spacing:-.015em; line-height:1.35; margin:0 0 14px; max-width:74ch; }
.ai-points{ display:grid; gap:10px; }
.ai-pt{ display:flex; gap:11px; align-items:flex-start; font-size:13.5px; line-height:1.5; color:var(--ink-2); }
.ai-pt svg{ flex:0 0 auto; margin-top:1px; }
.pt-good svg{ color:var(--green); } .pt-watch svg{ color:var(--amber); }
.pt-risk svg{ color:var(--brand); } .pt-action svg{ color:var(--blue); }
.pt-note svg{ color:var(--ink-4); }
/* loading shimmer */
.ai-skel{ height:13px; border-radius:6px; background:linear-gradient(90deg,#eef1f4 25%,#f6f8fa 37%,#eef1f4 63%);
  background-size:400% 100%; animation:shimmer 1.3s ease infinite; }
@keyframes shimmer{ 0%{background-position:100% 0} 100%{background-position:-100% 0} }

/* ---- KPI grid ---- */
.kpi-grid{ display:grid; grid-template-columns:repeat(6,1fr); gap:14px; margin:16px 0; }
.kpi{ background:var(--card); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow);
  padding:15px 16px 12px; display:flex; flex-direction:column; gap:9px; }
.kpi-top{ display:flex; align-items:center; justify-content:space-between; }
.kpi-label{ font-size:11.5px; font-weight:550; color:var(--ink-3); letter-spacing:.01em; }
.kpi-ico{ width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
.t-red{ background:var(--brand-50); color:var(--brand); }
.t-blue{ background:var(--blue-50); color:var(--blue); }
.t-violet{ background:var(--violet-50); color:var(--violet); }
.t-green{ background:var(--green-50); color:var(--green); }
.t-amber{ background:var(--amber-50); color:var(--amber); }
.t-teal{ background:var(--teal-50); color:var(--teal); }
.kpi-val{ font-family:var(--mono); font-size:26px; font-weight:600; letter-spacing:-.02em; line-height:1; }
.kpi-row{ display:flex; align-items:center; gap:8px; }
.delta{ display:inline-flex; align-items:center; gap:2px; font-size:11.5px; font-weight:600; padding:2px 6px; border-radius:6px; font-variant-numeric:tabular-nums; }
.delta.up{ color:var(--green); background:var(--green-50); }
.delta.down{ color:var(--brand); background:var(--brand-50); }
.kpi-sub{ font-size:11px; color:var(--ink-4); }
.kpi-spark{ margin-top:2px; }

/* ---- layout rows ---- */
.row-2{ display:grid; grid-template-columns:1.7fr 1fr; gap:16px; margin-bottom:16px; }
.row-3{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:16px; }

/* chart toggles */
.chips{ display:flex; gap:6px; }
.chip{ display:inline-flex; align-items:center; gap:6px; font:inherit; font-size:11.5px; font-weight:550; cursor:pointer;
  border:1px solid var(--line-2); background:var(--card); color:var(--ink-3); border-radius:999px; padding:4px 10px; transition:all .15s; }
.chip .dot{ width:8px; height:8px; border-radius:50%; }
.chip.off{ opacity:.45; }
.chip:hover{ border-color:var(--ink-4); }

/* recharts tooltip */
.tip{ background:#0F172A; color:#fff; border-radius:10px; padding:9px 11px; font-size:12px; box-shadow:0 8px 24px rgba(2,6,23,.25); }
.tip-date{ font-weight:600; margin-bottom:6px; font-size:11.5px; opacity:.85; }
.tip-row{ display:flex; align-items:center; gap:7px; line-height:1.7; }
.tip-dot{ width:8px; height:8px; border-radius:50%; }
.tip-name{ opacity:.8; margin-right:6px; }
.tip-val{ margin-left:auto; font-family:var(--mono); font-weight:600; }

/* funnel */
.funnel{ display:flex; flex-direction:column; gap:4px; margin-top:14px; }
.fn-stage{ }
.fn-top{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:5px; }
.fn-name{ font-size:12.5px; color:var(--ink-2); font-weight:550; }
.fn-count{ font-family:var(--mono); font-size:14px; font-weight:600; }
.fn-track{ height:30px; background:var(--hover); border-radius:8px; overflow:hidden; }
.fn-fill{ height:100%; border-radius:8px; transition:width .4s ease; min-width:6px; }
.fn-drop{ display:flex; align-items:center; gap:5px; font-size:11px; color:var(--ink-4); padding:3px 0 1px 2px; }

/* donut */
.donut-wrap{ position:relative; }
.donut-center{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.donut-center .n{ font-family:var(--mono); font-size:22px; font-weight:600; letter-spacing:-.02em; }
.donut-center .l{ font-size:10.5px; color:var(--ink-4); margin-top:1px; }
.legend{ display:grid; gap:7px; margin-top:6px; }
.lg-row{ display:flex; align-items:center; gap:8px; font-size:12.5px; }
.lg-dot{ width:9px; height:9px; border-radius:3px; flex:0 0 auto; }
.lg-name{ color:var(--ink-2); }
.lg-val{ margin-left:auto; font-family:var(--mono); color:var(--ink-3); font-size:12px; }

/* horizontal bars (nationalities) */
.hb{ display:grid; gap:12px; margin-top:14px; }
.hb-row{ }
.hb-top{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:5px; }
.hb-name{ font-size:12.5px; color:var(--ink-2); }
.hb-val{ font-size:11.5px; color:var(--ink-3); }
.hb-val .mono{ color:var(--ink-2); font-weight:600; }
.hb-track{ height:8px; background:var(--hover); border-radius:999px; overflow:hidden; }
.hb-fill{ height:100%; border-radius:999px; transition:width .4s ease; }
.hb-foot{ font-size:11.5px; color:var(--ink-4); margin-top:14px; }

/* attention list */
.att{ display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.att-row{ display:flex; align-items:center; gap:12px; padding:11px 12px; border:1px solid var(--line); border-radius:var(--radius-sm); transition:all .15s; }
.att-row:hover{ background:var(--hover); }
.att-ico{ width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.att-red{ background:var(--brand-50); color:var(--brand); }
.att-amber{ background:var(--amber-50); color:var(--amber); }
.att-slate{ background:var(--hover); color:var(--ink-3); }
.att-body{ min-width:0; }
.att-label{ font-size:12.5px; color:var(--ink-2); font-weight:500; line-height:1.35; }
.att-cta{ font-size:11px; color:var(--brand); font-weight:550; margin-top:1px; }
.att-val{ margin-left:auto; font-family:var(--mono); font-size:15px; font-weight:600; flex:0 0 auto; }
.att-val.warnr{ color:var(--brand); } .att-val.warna{ color:var(--amber); } .att-val.muted{ color:var(--ink-3); font-size:12px; }

/* leaderboard */
.lb-scroll{ overflow-x:auto; margin-top:14px; }
table.lb{ width:100%; border-collapse:collapse; min-width:840px; }
.lb th{ text-align:left; font-size:10.5px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-4);
  padding:0 12px 11px; border-bottom:1px solid var(--line); white-space:nowrap; }
.lb th.num{ text-align:right; }
.lb th.sortable{ cursor:pointer; user-select:none; }
.lb th.sortable:hover{ color:var(--ink-2); }
.lb th .sort-ar{ display:inline-block; margin-left:3px; color:var(--brand); }
.lb td{ padding:13px 12px; border-bottom:1px solid var(--line); font-size:13px; vertical-align:middle; }
.lb tr:last-child td{ border-bottom:0; }
.lb tbody tr{ transition:background .12s; }
.lb tbody tr:hover{ background:var(--hover); }
.lb td.num{ text-align:right; font-family:var(--mono); font-variant-numeric:tabular-nums; }
.rank{ width:26px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:12px; font-weight:600; color:var(--ink-3); background:var(--hover); }
.rank.r1{ background:#FEF6DD; color:#B7791F; box-shadow:inset 0 0 0 1px #F4D77E; }
.rank.r2{ background:#F1F3F6; color:#697586; box-shadow:inset 0 0 0 1px #DCE0E6; }
.rank.r3{ background:#FBEBE0; color:#B45F2B; box-shadow:inset 0 0 0 1px #F0CBAE; }
.agent-cell{ display:flex; align-items:center; gap:11px; }
.avatar{ width:34px; height:34px; border-radius:50%; flex:0 0 auto; display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:12px; font-weight:600; letter-spacing:.02em; }
.agent-name{ font-weight:600; color:var(--ink); font-size:13px; line-height:1.25; white-space:nowrap; }
.agent-role{ font-size:11px; color:var(--ink-4); }
.conv-pill{ display:inline-block; font-family:var(--mono); font-size:11.5px; font-weight:600; padding:2px 7px; border-radius:6px;
  background:var(--green-50); color:var(--green); }
.rev-muted{ color:var(--ink-4); }
.score-cell{ display:flex; align-items:center; gap:9px; justify-content:flex-end; }
.score-track{ width:72px; height:6px; background:var(--hover); border-radius:999px; overflow:hidden; }
.score-fill{ height:100%; background:linear-gradient(90deg,var(--brand),#FB6B73); border-radius:999px; }
.score-n{ font-family:var(--mono); font-size:12px; font-weight:600; width:26px; text-align:right; }
.lb-foot{ display:flex; align-items:center; justify-content:space-between; margin-top:14px; font-size:12px; color:var(--ink-4); }

/* ---- AI chatbox ---- */
.chat{ padding:18px 20px 16px; }
.chat-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.chat-hint{ font-size:12px; color:var(--ink-4); }
.chat-thread{ display:flex; flex-direction:column; gap:14px; margin-bottom:14px; }
.chat-q{ align-self:flex-end; max-width:80%; }
.chat-q span{ display:inline-block; background:var(--brand); color:#fff; font-size:13px; font-weight:500; padding:8px 13px; border-radius:13px 13px 4px 13px; }
.chat-a{ display:flex; gap:9px; align-items:flex-start; max-width:94%; }
.chat-a-ico{ flex:0 0 auto; width:24px; height:24px; border-radius:7px; background:var(--brand-50); color:var(--brand); display:flex; align-items:center; justify-content:center; margin-top:2px; }
.chat-a-body{ flex:1; background:var(--hover); border:1px solid var(--line); border-radius:4px 13px 13px 13px; padding:12px 14px; min-width:0; }
.chat-typing{ display:inline-flex; gap:4px; padding:3px 0; }
.chat-typing i{ width:6px; height:6px; border-radius:50%; background:var(--ink-4); animation:blink 1.2s infinite both; }
.chat-typing i:nth-child(2){ animation-delay:.2s; } .chat-typing i:nth-child(3){ animation-delay:.4s; }
@keyframes blink{ 0%,80%,100%{ opacity:.25; } 40%{ opacity:1; } }

.chat-input-row{ display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--line-2); border-radius:11px; padding:5px 6px 5px 12px; transition:box-shadow .15s,border-color .15s; }
.chat-input-row:focus-within{ border-color:var(--brand-100); box-shadow:0 0 0 3px var(--brand-50); }
.chat-input-ico{ color:var(--ink-4); flex:0 0 auto; }
.chat-input{ flex:1; border:0; outline:0; background:transparent; font:inherit; font-size:13.5px; color:var(--ink); padding:7px 0; min-width:0; }
.chat-input::placeholder{ color:var(--ink-4); }
.chat-send{ flex:0 0 auto; width:34px; height:34px; border:0; border-radius:9px; background:var(--brand); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity .15s,background .15s; }
.chat-send:hover{ background:var(--brand-d); } .chat-send:disabled{ opacity:.4; cursor:default; }
.chat-chips{ display:flex; flex-wrap:wrap; gap:7px; margin-top:11px; }
.chat-chip{ font:inherit; font-size:12px; color:var(--ink-2); background:var(--hover); border:1px solid var(--line-2); border-radius:999px; padding:6px 11px; cursor:pointer; transition:all .14s; }
.chat-chip:hover{ border-color:var(--brand-100); color:var(--brand); background:var(--brand-50); }

/* chat answers */
.ca-text{ font-size:13.5px; line-height:1.5; color:var(--ink-2); }
.ca-metric{ display:flex; align-items:center; gap:13px; }
.ca-metric-ico{ width:40px; height:40px; border-radius:11px; background:var(--brand-50); color:var(--brand); display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.ca-metric-n{ font-size:26px; font-weight:700; line-height:1; color:var(--ink); }
.ca-metric-l{ font-size:12.5px; color:var(--ink-3); margin-top:4px; }
.ca-rank-h, .ca-tl-sub{ font-size:11px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:var(--ink-4); margin-bottom:10px; }
.ca-rank-row{ display:flex; align-items:center; gap:10px; margin-bottom:9px; }
.ca-rank-row:last-child{ margin-bottom:0; }
.ca-rank-i{ width:16px; font-size:11px; color:var(--ink-4); text-align:right; flex:0 0 auto; }
.ca-rank-name{ font-size:13px; font-weight:550; color:var(--ink); width:148px; flex:0 0 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ca-rank-bar{ flex:1; height:7px; background:var(--card); border:1px solid var(--line); border-radius:999px; overflow:hidden; min-width:40px; }
.ca-rank-bar span{ display:block; height:100%; background:linear-gradient(90deg,var(--brand),#FB6B73); }
.ca-rank-v{ font-size:12.5px; font-weight:600; color:var(--ink-2); width:42px; text-align:right; flex:0 0 auto; }

.ca-tl-h{ display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.ca-tl-name{ font-size:14px; font-weight:650; color:var(--ink); }
.ca-day{ border-left:2px solid var(--line-2); padding:0 0 14px 13px; margin-left:4px; position:relative; }
.ca-day:last-child{ padding-bottom:0; }
.ca-day::before{ content:''; position:absolute; left:-5px; top:4px; width:8px; height:8px; border-radius:50%; background:var(--brand); }
.ca-day-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.ca-day-date{ font-size:12.5px; font-weight:650; color:var(--ink); }
.ca-day-meta{ font-size:11.5px; color:var(--ink-3); display:inline-flex; align-items:center; gap:5px; }
.ca-day-off{ font-size:11.5px; color:var(--ink-4); font-style:italic; }
.ca-chips{ display:flex; flex-wrap:wrap; gap:6px; margin:9px 0 2px; }
.ca-chip{ font-size:11px; color:var(--ink-2); background:var(--card); border:1px solid var(--line); border-radius:7px; padding:3px 7px; display:inline-flex; align-items:center; gap:4px; }
.ca-chip svg{ color:var(--ink-4); }
.ca-entries{ display:flex; flex-direction:column; gap:7px; margin-top:9px; }
.ca-entry{ display:flex; align-items:baseline; gap:9px; font-size:12.5px; line-height:1.45; }
.ca-entry-time{ font-size:11px; color:var(--ink-4); flex:0 0 auto; width:42px; }
.ca-entry-tag{ flex:0 0 auto; font-size:9.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; padding:1px 6px; border-radius:5px; }
.tag-call{ background:var(--blue-50); color:var(--blue); }
.tag-email{ background:var(--violet-50); color:var(--violet); }
.tag-spoken{ background:var(--teal-50); color:var(--teal); }
.tag-note{ background:var(--amber-50); color:var(--amber); }
.ca-entry-text{ color:var(--ink-2); }
.ca-entry-text b{ color:var(--ink); font-weight:600; }

.avatar.sm{ width:26px; height:26px; font-size:10px; }

/* activity leaderboard extras */
.start-pill{ display:inline-flex; align-items:center; gap:5px; font-family:var(--mono); font-size:11.5px; font-weight:600; color:var(--ink-2);
  background:var(--green-50); border-radius:6px; padding:3px 8px; }
.start-pill svg{ color:var(--green); }
.note-pill{ display:inline-block; min-width:22px; font-family:var(--mono); font-size:11.5px; font-weight:700; color:var(--brand); background:var(--brand-50); border-radius:6px; padding:2px 7px; }
.of-days{ color:var(--ink-4); font-size:11px; }

/* page footer note */
.pe-note{ margin-top:18px; font-size:11.5px; color:var(--ink-4); display:flex; align-items:center; gap:7px; }

/* fade-in */
.fade{ animation:fade .4s ease both; }
@keyframes fade{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }

/* responsive */
@media (max-width:1500px){ .kpi-grid{ grid-template-columns:repeat(3,1fr); } }
@media (max-width:1100px){
  .row-2{ grid-template-columns:1fr; } .row-3{ grid-template-columns:1fr; }
}
@media (max-width:760px){
  .pqt-exec{ padding:18px 16px 40px; } .kpi-grid{ grid-template-columns:repeat(2,1fr); }
}
`;

/* ============================================================================
   HELPERS
   ========================================================================== */
const fmt = (n) => n.toLocaleString("en-US");
const money = (n) =>
  n >= 1_000_000
    ? "$" + (n / 1e6).toFixed(1) + "M"
    : "$" + n.toLocaleString("en-US");

const PALETTE = [
  "#E5202E",
  "#2563EB",
  "#15A34A",
  "#D97706",
  "#7C3AED",
  "#0EA5E9",
];
const AVATAR_COLORS = [
  "#E5202E",
  "#2563EB",
  "#15A34A",
  "#D97706",
  "#7C3AED",
  "#EC4899",
  "#0EA5E9",
  "#0D9488",
  "#F43F5E",
];

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
const downsample = (arr, k) => {
  if (arr.length <= k) return arr;
  const out = [];
  for (let i = 0; i < k; i++)
    out.push(arr[Math.round((i * (arr.length - 1)) / (k - 1))]);
  return out;
};

/* Small SVG sparkline (no chart library — keeps KPI cards light) */
function Sparkline({ data, color, id, width = 132, height = 34 }) {
  const max = Math.max(...data),
    min = Math.min(...data),
    range = max - min || 1;
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * width,
    height - 3 - ((d - min) / range) * (height - 6),
  ]);
  const line = pts
    .map(
      (p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1),
    )
    .join(" ");
  const area = line + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={"sg" + id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Delta({ d, pts }) {
  if (d === null || d === undefined) return null;
  const up = d >= 0;
  return (
    <span className={"delta " + (up ? "up" : "down")}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(d)}
      {pts ? " pts" : "%"}
    </span>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tip">
      <div className="tip-date">{label}</div>
      {payload.map((p) => (
        <div className="tip-row" key={p.dataKey}>
          <span className="tip-dot" style={{ background: p.color }} />
          <span className="tip-name">{p.name}</span>
          <span className="tip-val">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}


// Activity-log types → label + icon, used by the team-activity table and the
// chat timeline/ranking answers.
const LOG_TYPES = [
  { key: "call", label: "Calls", icon: Phone },
  { key: "email", label: "Emails", icon: Mail },
  { key: "spoken", label: "Spoken", icon: MessageSquare },
  { key: "note", label: "Notes", icon: StickyNote },
];

const sumCounts = (days) =>
  days.reduce(
    (a, d) => ({
      call: a.call + d.counts.call,
      email: a.email + d.counts.email,
      spoken: a.spoken + d.counts.spoken,
      note: a.note + d.counts.note,
    }),
    { call: 0, email: 0, spoken: 0, note: 0 },
  );

const totalOf = (c) => c.call + c.email + c.spoken + c.note;


function matchPeriod(q) {
  const ql = q.toLowerCase();
  const m = ql.match(/last\s+(\d{1,2})\s*day/);
  if (m) {
    const n = Math.min(60, Math.max(1, parseInt(m[1], 10)));
    return { days: n, label: `the last ${n} days` };
  }
  if (/\btoday\b/.test(ql)) return { days: 1, label: "today" };
  if (/this week|past week|last 7|weekly|\bweek\b/.test(ql))
    return { days: 7, label: "the last 7 days" };
  if (/this month|past month|last 30|monthly|\bmonth\b|30\s*day/.test(ql))
    return { days: 30, label: "the last 30 days" };
  return null;
}

const METRICS = [
  {
    key: "call",
    re: /\bcalls?\b|called|calling|phone/,
    label: "calls",
    fromLog: true,
  },
  {
    key: "email",
    re: /\bemails?\b|emailed|mailed/,
    label: "emails",
    fromLog: true,
  },
  {
    key: "spoken",
    re: /\bspoke(n)?\b|conversation/,
    label: "spoken logs",
    fromLog: true,
  },
  { key: "note", re: /\bnotes?\b|contact log/, label: "notes", fromLog: true },
  {
    key: "leads",
    re: /\bleads?\b|converted|conversion/,
    label: "leads",
    fromLog: false,
  },
  {
    key: "enq",
    re: /\benquir|inquir|enquiry/,
    label: "enquiries",
    fromLog: false,
  },
  {
    key: "total",
    re: /activ|busy|touch|working|logged|effort|productiv/,
    label: "logged actions",
    fromLog: true,
  },
];



/* ============================================================================
   MAIN COMPONENT
   ========================================================================== */
export default function ExecutiveDashboard({ data }: { data?: any } = {}) {
  // Live CRM aggregates (from getExecutiveData) with the mock constants as a
  // fallback so the design still renders if data is unavailable. The activity
  // log + chat remain demo until the per-event / AI phase.
  const EMPTY_DS = {
    enquiries: { v: 0, d: 0 },
    leads: { v: 0, d: 0 },
    clients: { v: 0, d: 0 },
    conv: { v: 0, d: 0 },
    bookings: { v: 0, d: 0 },
    revenue: { v: 0, d: 0 },
    sales: 0,
  };
  const DS = data?.datasets ?? { "7d": EMPTY_DS, "30d": EMPTY_DS, "90d": EMPTY_DS };
  const SRC = data?.sourceSplit ?? [];
  const NATS = data?.nationalities ?? [];
  const TOTAL = data?.totalClients ?? 0;
  const ATTN = data?.attention
    ? [
        {
          icon: Phone,
          tone: "red",
          label: "New enquiries untouched for 7+ days",
          value: fmt(data.attention.staleEnquiries),
          valClass: "warnr",
          cta: "Review backlog",
        },
        {
          icon: Inbox,
          tone: "amber",
          label: "Unassigned enquiries (no owner)",
          value: fmt(data.attention.unassigned),
          valClass: "warna",
          cta: "Assign owners",
        },
        {
          icon: AlertTriangle,
          tone: "slate",
          label: `Client base concentration — top agent holds ${data.attention.concentrationPct}%`,
          value: data.attention.concentrationPct >= 35 ? "Risk" : "OK",
          valClass: "muted",
          cta: "Rebalance team load",
        },
      ]
    : [];

  const TODAY = useMemo(() => new Date(), []);
  const [range, setRange] = useState("30d"); // 7d | 30d | 90d | custom
  const [cStart, setCStart] = useState("2026-05-10");
  const [cEnd, setCEnd] = useState("2026-06-08");
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [showEnq, setShowEnq] = useState(true);
  const [showLeads, setShowLeads] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null); // null => show curated
  const [aiStamp, setAiStamp] = useState("");
  const [actView, setActView] = useState("daily"); // daily | weekly | monthly
  const [actSortKey, setActSortKey] = useState("total");
  const [actSortDir, setActSortDir] = useState("desc");
  const [chatMsgs, setChatMsgs] = useState([]); // {role:'user'|'bot', text? , result?}
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // resolve the active window + which dataset "bucket" to use
  const { start, end, bucket } = useMemo(() => {
    if (range === "custom") {
      const s = new Date(cStart + "T00:00:00"),
        e = new Date(cEnd + "T00:00:00");
      const days = Math.max(1, Math.round((e - s) / 86400000) + 1);
      return {
        start: s,
        end: e,
        bucket: days <= 10 ? "7d" : days <= 45 ? "30d" : "90d",
      };
    }
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const s = new Date(TODAY);
    s.setDate(s.getDate() - (days - 1));
    return { start: s, end: new Date(TODAY), bucket: range };
  }, [range, cStart, cEnd, TODAY]);

  const kpi = DS[bucket];

  // Real per-range leaderboard (agentsByRange) → conversion + a 0–100 score.
  const agents = useMemo(() => {
    const list = data?.agentsByRange?.[bucket] ?? data?.agents30d ?? [];
    const scored = list.map((a) => {
      const conv = a.enq ? (a.leads / a.enq) * 100 : 0;
      const raw =
        a.leads * 5 +
        a.clients * 7 +
        conv * 1.0 +
        a.activity * 0.06 +
        (a.rev > 0 ? 22 : 0);
      return { ...a, conv, raw };
    });
    const maxRaw = Math.max(...scored.map((a) => a.raw), 1);
    return scored.map((a) => ({
      ...a,
      score: Math.round((a.raw / maxRaw) * 100),
    }));
  }, [data, bucket]);

  const agentsSorted = useMemo(() => {
    const arr = [...agents];
    arr.sort((a, b) => {
      let x = a[sortKey],
        y = b[sortKey];
      if (sortKey === "name") {
        x = a.name;
        y = b.name;
        return sortDir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
      }
      return sortDir === "asc" ? x - y : y - x;
    });
    return arr;
  }, [agents, sortKey, sortDir]);

  // Real daily time-series (data.series, last 90d) sliced to the active window.
  const series = useMemo(() => {
    const raw = data?.series ?? [];
    const startMs = start.getTime();
    const endMs = end.getTime();
    const within = raw.filter((p) => {
      const t = new Date(p.date).getTime();
      return t >= startMs - 86400000 && t <= endMs + 86400000;
    });
    const pts = within.length ? within : raw;
    return pts.map((p) => ({
      label: new Date(p.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      enquiries: p.enquiries,
      leads: p.leads,
      clients: p.clients,
      bookings: p.bookings,
      revenue: p.revenue,
    }));
  }, [data, start, end]);

  // funnel + sources from the period totals
  const funnel = useMemo(() => {
    const s = [
      { name: "Enquiries", v: kpi.enquiries.v, color: PALETTE[1] },
      { name: "Leads", v: kpi.leads.v, color: PALETTE[4] },
      { name: "Bookings", v: kpi.bookings.v, color: PALETTE[3] },
      { name: "Sales (won)", v: kpi.sales, color: PALETTE[2] },
    ];
    const top = s[0].v || 1;
    return s.map((st, i) => ({
      ...st,
      width: Math.max(2, (st.v / top) * 100),
      drop: i > 0 && s[i - 1].v ? (st.v / s[i - 1].v) * 100 : null,
    }));
  }, [kpi]);

  const sources = useMemo(
    () =>
      SRC.map((s, i) => ({
        name: s.name,
        value: Math.round(kpi.enquiries.v * s.p),
        color: PALETTE[i],
      })),
    [kpi],
  );

  // ---- Real per-agent activity (from getExecutiveData) ----
  const ACTIVITY = data?.activityDays ?? [];

  const actWindow = actView === "daily" ? 1 : actView === "weekly" ? 7 : 30;

  const actRows = useMemo(() => {
    const rows = ACTIVITY.map((a) => {
      const slice = a.days.slice(0, actWindow);
      const c = sumCounts(slice);
      const total = c.call + c.email + c.spoken + c.note;
      const activeDays = slice.filter((d) => d.started).length;
      return {
        name: a.name,
        role: a.role,
        ...c,
        total,
        activeDays,
        started: a.days[0].started,
      };
    });
    rows.sort((x, y) => {
      if (actSortKey === "name")
        return actSortDir === "asc"
          ? x.name.localeCompare(y.name)
          : y.name.localeCompare(x.name);
      if (actSortKey === "started") {
        const xv = x.started ? x.started.getTime() : Infinity,
          yv = y.started ? y.started.getTime() : Infinity;
        return actSortDir === "asc" ? xv - yv : yv - xv;
      }
      return actSortDir === "asc"
        ? x[actSortKey] - y[actSortKey]
        : y[actSortKey] - x[actSortKey];
    });
    return rows;
  }, [ACTIVITY, actWindow, actSortKey, actSortDir]);

  // reset AI to the curated summary whenever the window changes
  useEffect(() => {
    setAiSummary(null);
    setAiStamp("");
  }, [range, cStart, cEnd]);

  const rangeLabel = useMemo(() => {
    const o = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("en-GB", o)} – ${end.toLocaleDateString("en-GB", { ...o, year: "numeric" })}`;
  }, [start, end]);
  const prevLabel =
    bucket === "7d" ? "week" : bucket === "90d" ? "90 days" : "30 days";

  /* ---- AI: live regenerate via Claude (optional showcase) ----------------
     In the artifact preview this calls Claude directly. In the real CRM,
     ⚠️ DATA-WIRING: call YOUR backend (which calls Claude server-side with a
     key) and pass the REAL metrics. Any failure falls back to curated text. */
  async function regenerateWithAI() {
    setAiLoading(true);
    try {
      const topAgents = agentsSorted.slice(0, 3).map((a) => ({
        name: a.name,
        leads: a.leads,
        clients: a.clients,
        conv: a.conv,
        activity: a.activity,
      }));
      const parsed = await getExecutiveSummary({ rangeLabel, kpi, topAgents });
      if (parsed && parsed.headline && Array.isArray(parsed.points)) {
        setAiSummary(parsed);
        setAiStamp(
          new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      }
    } catch (e) {
      console.error("Live AI summary unavailable — showing cached summary.", e);
    } finally {
      setAiLoading(false);
    }
  }

  /* ---- AI chatbox: resolve a question into an answer --------------------
     The local resolver handles the common questions instantly. Anything it
     can't classify optionally goes to Claude live (preview only).
     ⚠️ DATA-WIRING: in the real CRM, send the question to YOUR backend, which
     runs the DB query and (optionally) has Claude phrase the result. */
  // Match a query to a REAL agent (from the live activity feed), not the mock list.
  function matchAgentReal(query) {
    const ql = query.toLowerCase();
    let best = null;
    let score = 0;
    for (const a of ACTIVITY) {
      const nm = a.name.toLowerCase();
      let s = 0;
      if (ql.includes(nm)) s += 60;
      nm.split(/\s+/).forEach((tok) => {
        if (tok.length >= 3 && ql.includes(tok)) s += tok.length;
      });
      if (s > score) {
        score = s;
        best = a;
      }
    }
    return score >= 4 ? best : null;
  }

  // Component-scope resolver — same intents as resolveQuery but over LIVE data
  // (ACTIVITY = real per-agent days, `agents` = real leaderboard, kpi = real totals).
  function resolveLocal(query) {
    const ql = (query || "").toLowerCase().trim();
    if (!ql) return { kind: "empty" };
    const agent = matchAgentReal(query);
    const period = matchPeriod(query);
    const metric = METRICS.find((m) => m.re.test(ql));
    const wantsRank =
      /\bmost\b|\btop\b|highest|best|busiest|\bleast\b|fewest|lowest|laziest|rank|leaderboard|\bwho\b/.test(
        ql,
      );
    const dir = /\bleast\b|fewest|lowest|laziest|quiet/.test(ql) ? "asc" : "desc";

    if (
      agent &&
      !wantsRank &&
      (period ||
        /activity|timeline|breakdown|\blog\b|what.*(do|did)|update/.test(ql))
    ) {
      return {
        kind: "timeline",
        agent: { name: agent.name, role: agent.role },
        days: period ? period.days : 5,
      };
    }

    if (wantsRank && metric) {
      const days = period ? period.days : 7;
      const rows = ACTIVITY.map((a) => {
        let value;
        if (metric.fromLog) {
          const c = sumCounts(a.days.slice(0, days));
          value = metric.key === "total" ? totalOf(c) : c[metric.key];
        } else {
          const ag = agents.find((x) => x.name === a.name);
          value = ag ? (metric.key === "leads" ? ag.leads : ag.enq) : 0;
        }
        return { name: a.name, role: a.role, value };
      }).sort((x, y) => (dir === "asc" ? x.value - y.value : y.value - x.value));
      return {
        kind: "ranking",
        metric,
        dir,
        periodLabel: period ? period.label : "the last 7 days",
        rows,
      };
    }

    if (metric) {
      const days = period ? period.days : 30;
      let total = 0;
      if (metric.fromLog) {
        ACTIVITY.forEach((a) => {
          const c = sumCounts(a.days.slice(0, days));
          total += metric.key === "total" ? totalOf(c) : c[metric.key];
        });
      } else {
        total = metric.key === "leads" ? kpi.leads.v : kpi.enquiries.v;
      }
      return {
        kind: "metric",
        metric,
        periodLabel: period ? period.label : "the selected period",
        total,
      };
    }

    if (agent) {
      return { kind: "timeline", agent: { name: agent.name, role: agent.role }, days: 5 };
    }
    return { kind: "ai" };
  }

  async function askCRM(qRaw) {
    const q = (qRaw ?? chatInput).trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatMsgs((m) => [...m, { role: "user", text: q }]);

    const result = resolveLocal(q);
    if (result.kind !== "ai") {
      setChatMsgs((m) => [...m, { role: "bot", result }]);
      return;
    }

    // Free-form questions go to the CRM's server-side AI (configured provider).
    setChatLoading(true);
    try {
      const text = await askExecutive(q, {
        rangeLabel,
        kpi,
        agents: agentsSorted.map((a) => ({
          name: a.name,
          role: a.role,
          enq: a.enq,
          leads: a.leads,
          clients: a.clients,
          activity: a.activity,
          rev: a.rev,
        })),
      });
      setChatMsgs((m) => [
        ...m,
        { role: "bot", result: { kind: "text", text } },
      ]);
    } catch {
      setChatMsgs((m) => [
        ...m,
        {
          role: "bot",
          result: {
            kind: "text",
            text: "I can answer questions about agent activity, calls, emails, notes, leads and enquiries — try one of the example questions below.",
          },
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // Default summary computed from the REAL metrics (no AI required); the
  // "Regenerate" button swaps in a live AI-written version when configured.
  const localSummary = useMemo(() => {
    const top = agentsSorted[0];
    const sign = (x) => (x >= 0 ? "+" + x : "" + x);
    const points = [
      {
        type: kpi.enquiries.d >= 0 ? "good" : "watch",
        text: `${fmt(kpi.enquiries.v)} enquiries in ${rangeLabel} (${sign(kpi.enquiries.d)}% vs the prior ${prevLabel}).`,
      },
      {
        type: "watch",
        text: `${fmt(kpi.leads.v)} leads and ${fmt(kpi.clients.v)} new clients — ${kpi.conv.v}% enquiry→lead conversion.`,
      },
    ];
    if (top) {
      points.push({
        type: "good",
        text: `${top.name} leads the team with ${top.leads} leads, ${top.clients} clients and ${fmt(top.activity)} logged actions.`,
      });
    }
    points.push({
      type: kpi.sales > 0 ? "good" : "risk",
      text:
        kpi.sales > 0
          ? `${kpi.sales} sale${kpi.sales === 1 ? "" : "s"} won — ${kpi.revenue.v ? "$" + fmt(kpi.revenue.v) : "$0"} revenue. ${fmt(kpi.bookings.v)} bookings in progress.`
          : `No sales closed yet in ${rangeLabel}; ${fmt(kpi.bookings.v)} bookings in progress need follow-through.`,
    });
    return {
      headline: `${fmt(kpi.enquiries.v)} enquiries, ${fmt(kpi.leads.v)} leads and ${kpi.sales} sale${kpi.sales === 1 ? "" : "s"} in ${rangeLabel}.`,
      points,
    };
  }, [kpi, agentsSorted, rangeLabel, prevLabel]);

  const summary = aiSummary || localSummary;

  // Chat suggestion chips, seeded with a real top agent's name when available.
  const chatExamples = useMemo(() => {
    const top = ACTIVITY[0]?.name;
    const proper = top
      ? top.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      : null;
    return [
      proper
        ? `Show me the last 5 days of ${proper}`
        : "Show me an agent's last 5 days",
      "Who made the most calls this week?",
      "Who logged the fewest notes today?",
      "How many leads in the last 30 days?",
    ];
  }, [ACTIVITY]);
  const ptIcon = {
    good: CheckCircle2,
    watch: AlertCircle,
    risk: AlertTriangle,
    action: Target,
    note: Sparkles,
  };

  // Real KPI sparklines, downsampled from the daily series.
  const sparkE = downsample(series.map((s) => s.enquiries), 12);
  const sparkL = downsample(series.map((s) => s.leads), 12);
  const sparkC = downsample(series.map((s) => s.clients), 12);
  const sparkB = downsample(series.map((s) => s.bookings), 12);
  const sparkR = downsample(series.map((s) => s.revenue), 12);
  const sparkConv = downsample(
    series.map((s) => (s.enquiries ? (s.leads / s.enquiries) * 100 : 0)),
    12,
  );

  const KPI_CARDS = [
    {
      key: "enquiries",
      label: "Enquiries",
      icon: Inbox,
      tone: "t-red",
      color: "#E5202E",
      spark: sparkE,
    },
    {
      key: "leads",
      label: "Leads",
      icon: Target,
      tone: "t-blue",
      color: "#2563EB",
      spark: sparkL,
    },
    {
      key: "clients",
      label: "New clients",
      icon: Users,
      tone: "t-violet",
      color: "#7C3AED",
      spark: sparkC,
    },
    {
      key: "conv",
      label: "Lead conversion",
      icon: TrendingUp,
      tone: "t-green",
      color: "#15A34A",
      sub: "enquiry → lead",
      pts: true,
      unit: "%",
      spark: sparkConv,
    },
    {
      key: "bookings",
      label: "Bookings",
      icon: Calendar,
      tone: "t-amber",
      color: "#D97706",
      spark: sparkB,
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: DollarSign,
      tone: "t-teal",
      color: "#0D9488",
      money: true,
      spark: sparkR,
    },
  ];

  const SortHead = ({ k, children, num }) => (
    <th
      className={"sortable " + (num ? "num" : "")}
      onClick={() => {
        setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc");
        setSortKey(k);
      }}
    >
      {children}
      {sortKey === k && (
        <span className="sort-ar">{sortDir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );

  const ActSortHead = ({ k, children, num }) => (
    <th
      className={"sortable " + (num ? "num" : "")}
      onClick={() => {
        setActSortDir(
          actSortKey === k && actSortDir === "desc" ? "asc" : "desc",
        );
        setActSortKey(k);
      }}
    >
      {children}
      {actSortKey === k && (
        <span className="sort-ar">{actSortDir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );

  const timeStr = (d) =>
    d
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "—";
  const dayStr = (d) =>
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  // renders one chatbox answer (timeline / ranking / metric / plain text)
  function ChatAnswer({ result }) {
    if (result.kind === "text")
      return <div className="ca-text">{result.text}</div>;

    if (result.kind === "metric") {
      const Ico =
        LOG_TYPES.find((t) => t.key === result.metric.key)?.icon || Activity;
      return (
        <div className="ca-metric">
          <span className="ca-metric-ico">
            <Ico size={18} />
          </span>
          <div>
            <div className="ca-metric-n mono">{fmt(result.total)}</div>
            <div className="ca-metric-l">
              {result.metric.label} across the team · {result.periodLabel}
            </div>
          </div>
        </div>
      );
    }

    if (result.kind === "ranking") {
      const top = result.rows.slice(0, 6);
      const max = Math.max(...top.map((r) => r.value), 1);
      return (
        <div className="ca-rank">
          <div className="ca-rank-h">
            {result.dir === "asc" ? "Fewest" : "Most"} {result.metric.label} ·{" "}
            {result.periodLabel}
          </div>
          {top.map((r, i) => (
            <div className="ca-rank-row" key={r.name}>
              <span className="ca-rank-i mono">{i + 1}</span>
              <span
                className="avatar sm"
                style={{
                  background:
                    AVATAR_COLORS[hash(r.name) % AVATAR_COLORS.length],
                }}
              >
                {initials(r.name)}
              </span>
              <span className="ca-rank-name">{r.name}</span>
              <span className="ca-rank-bar">
                <span style={{ width: (r.value / max) * 100 + "%" }} />
              </span>
              <span className="ca-rank-v mono">{fmt(r.value)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (result.kind === "timeline") {
      const days = (
        ACTIVITY.find((a) => a.name === result.agent.name)?.days ?? []
      ).slice(0, result.days);
      return (
        <div className="ca-tl">
          <div className="ca-tl-h">
            <span
              className="avatar sm"
              style={{
                background:
                  AVATAR_COLORS[hash(result.agent.name) % AVATAR_COLORS.length],
              }}
            >
              {initials(result.agent.name)}
            </span>
            <div>
              <div className="ca-tl-name">{result.agent.name}</div>
              <div className="ca-tl-sub">
                {result.agent.role} · last {result.days} days
              </div>
            </div>
          </div>
          {days.map((d, i) => (
            <div className="ca-day" key={i}>
              <div className="ca-day-top">
                <span className="ca-day-date">{dayStr(d.date)}</span>
                {d.started ? (
                  <span className="ca-day-meta">
                    <LogIn size={12} /> started {timeStr(d.started)} ·{" "}
                    <span className="mono">
                      {d.counts.call +
                        d.counts.email +
                        d.counts.spoken +
                        d.counts.note}
                    </span>{" "}
                    touches
                  </span>
                ) : (
                  <span className="ca-day-off">no activity logged</span>
                )}
              </div>
              {d.started && (
                <div className="ca-chips">
                  {LOG_TYPES.map((t) =>
                    d.counts[t.key] > 0 ? (
                      <span className="ca-chip" key={t.key}>
                        <t.icon size={11} /> {d.counts[t.key]}{" "}
                        {t.label.toLowerCase()}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
              {d.entries.length > 0 && (
                <div className="ca-entries">
                  {d.entries.map((e, j) => (
                    <div className="ca-entry" key={j}>
                      <span className="ca-entry-time mono">
                        {timeStr(e.time)}
                      </span>
                      <span className={"ca-entry-tag tag-" + e.type}>
                        {e.type}
                      </span>
                      <span className="ca-entry-text">
                        <b>{e.client}</b> — {e.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="pqt-exec">
      <style>{CSS}</style>

      {/* ---------------- HEADER ---------------- */}
      <div className="pe-head">
        <div>
          <h1 className="pe-title">Executive overview</h1>
          <p className="pe-sub">
            The whole CRM at a glance — performance, pipeline and team activity.
          </p>
          <span className="pe-range-resolved">
            <Calendar size={13} /> Showing{" "}
            <span className="mono">{rangeLabel}</span>
          </span>
        </div>
        <div className="pe-head-right">
          <div className="seg">
            {[
              ["7d", "7 days"],
              ["30d", "30 days"],
              ["90d", "90 days"],
              ["custom", "Custom"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={range === k ? "on" : ""}
                onClick={() => setRange(k)}
              >
                {l}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="date-pop">
              <input
                type="date"
                value={cStart}
                max={cEnd}
                onChange={(e) => setCStart(e.target.value)}
                aria-label="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={cEnd}
                min={cStart}
                onChange={(e) => setCEnd(e.target.value)}
                aria-label="End date"
              />
            </div>
          )}
          <button
            className="icon-btn"
            aria-label="Refresh data"
            onClick={regenerateWithAI}
          >
            <RefreshCw size={16} className={aiLoading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* ---------------- AI SUMMARY ---------------- */}
      <div className="card ai fade">
        <div className="ai-bar" />
        <div className="ai-pad">
          <div className="ai-top">
            <div className="ai-badge">
              <span className="ai-spark">
                <Sparkles size={17} />
              </span>
              <span className="ai-label">AI executive summary</span>
              <span className="ai-pill">Claude</span>
            </div>
            <div className="ai-meta">
              <span className="ai-stamp">
                <Clock size={12} />{" "}
                {aiSummary ? "Updated " + aiStamp : "Auto-generated"}
              </span>
              <button
                className="ai-regen"
                onClick={regenerateWithAI}
                disabled={aiLoading}
              >
                <RefreshCw size={13} className={aiLoading ? "spin" : ""} />
                {aiLoading ? "Thinking…" : "Regenerate"}
              </button>
            </div>
          </div>

          {aiLoading ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="ai-skel" style={{ width: "62%", height: 16 }} />
              <div className="ai-skel" style={{ width: "92%" }} />
              <div className="ai-skel" style={{ width: "85%" }} />
              <div className="ai-skel" style={{ width: "88%" }} />
            </div>
          ) : (
            <>
              <p className="ai-headline">{summary.headline}</p>
              <div className="ai-points">
                {summary.points.map((p, i) => {
                  const Ico = ptIcon[p.type] || Sparkles;
                  return (
                    <div className={"ai-pt pt-" + p.type} key={i}>
                      <Ico size={16} />
                      <span>{p.text}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------------- AI CHATBOX ---------------- */}
      <div className="card chat fade" style={{ marginTop: 16 }}>
        <div className="chat-head">
          <div className="ai-badge">
            <span className="ai-spark">
              <MessageSquare size={16} />
            </span>
            <span className="ai-label">Ask the CRM</span>
            <span className="ai-pill">Claude</span>
          </div>
          <span className="chat-hint">
            Ask about any agent or metric — answers in plain English
          </span>
        </div>

        {chatMsgs.length > 0 && (
          <div className="chat-thread">
            {chatMsgs.map((m, i) =>
              m.role === "user" ? (
                <div className="chat-q" key={i}>
                  <span>{m.text}</span>
                </div>
              ) : (
                <div className="chat-a" key={i}>
                  <span className="chat-a-ico">
                    <Sparkles size={13} />
                  </span>
                  <div className="chat-a-body">
                    <ChatAnswer result={m.result} />
                  </div>
                </div>
              ),
            )}
            {chatLoading && (
              <div className="chat-a">
                <span className="chat-a-ico">
                  <Sparkles size={13} />
                </span>
                <div className="chat-a-body">
                  <span className="chat-typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="chat-input-row">
          <Search size={15} className="chat-input-ico" />
          <input
            className="chat-input"
            placeholder="e.g. Show me the last 5 days of Nazmus Sadat"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") askCRM();
            }}
          />
          <button
            className="chat-send"
            onClick={() => askCRM()}
            disabled={chatLoading || !chatInput.trim()}
          >
            <Send size={15} />
          </button>
        </div>

        <div className="chat-chips">
          {chatExamples.map((ex) => (
            <button className="chat-chip" key={ex} onClick={() => askCRM(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- KPI ROW ---------------- */}
      <div className="kpi-grid">
        {KPI_CARDS.map((c) => {
          const m = kpi[c.key];
          const Ico = c.icon;
          const isZeroRev = c.money && m.v === 0;
          let val = c.money ? money(m.v) : fmt(m.v);
          if (c.unit) val = m.v + c.unit;
          return (
            <div className="kpi fade" key={c.key}>
              <div className="kpi-top">
                <span className="kpi-label">{c.label}</span>
                <span className={"kpi-ico " + c.tone}>
                  <Ico size={15} />
                </span>
              </div>
              <div className="kpi-row">
                <span className="kpi-val">{val}</span>
                {!isZeroRev && <Delta d={m.d} pts={c.pts} />}
              </div>
              <div className="kpi-spark">
                <Sparkline data={c.spark} color={c.color} id={c.key} />
              </div>
              <span className="kpi-sub">
                {c.sub
                  ? c.sub
                  : isZeroRev
                    ? "no sales in range"
                    : "vs previous " + prevLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* ---------------- ACTIVITY + FUNNEL ---------------- */}
      <div className="row-2">
        <div className="card card-pad fade">
          <div className="card-h">
            <div>
              <h3 className="card-t">Performance over time</h3>
              <p className="card-d">
                Enquiries and leads across the selected window
              </p>
            </div>
            <div className="chips">
              <button
                className={"chip " + (showEnq ? "" : "off")}
                onClick={() => setShowEnq((v) => !v)}
              >
                <span className="dot" style={{ background: "#E5202E" }} />{" "}
                Enquiries
              </button>
              <button
                className={"chip " + (showLeads ? "" : "off")}
                onClick={() => setShowLeads((v) => !v)}
              >
                <span className="dot" style={{ background: "#2563EB" }} /> Leads
              </button>
            </div>
          </div>
          <div style={{ height: 280, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 12, right: 6, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E5202E" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#E5202E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EEF1F4" />
                <XAxis
                  dataKey="label"
                  interval={Math.max(0, Math.floor(series.length / 6))}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  content={<ChartTip />}
                  cursor={{ stroke: "#E2E6EC" }}
                />
                {showEnq && (
                  <Area
                    type="monotone"
                    dataKey="enquiries"
                    name="Enquiries"
                    stroke="#E5202E"
                    strokeWidth={2}
                    fill="url(#gE)"
                  />
                )}
                {showLeads && (
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#gL)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad fade">
          <div className="card-h">
            <div>
              <h3 className="card-t">Pipeline funnel</h3>
              <p className="card-d">Where opportunities drop off this period</p>
            </div>
          </div>
          <div className="funnel">
            {funnel.map((s, i) => (
              <div className="fn-stage" key={s.name}>
                {i > 0 && (
                  <div className="fn-drop">
                    <ChevronDown size={12} />{" "}
                    {s.drop !== null
                      ? s.drop.toFixed(1) + "% carried through"
                      : "—"}
                  </div>
                )}
                <div className="fn-top">
                  <span className="fn-name">{s.name}</span>
                  <span className="fn-count">{fmt(s.v)}</span>
                </div>
                <div className="fn-track">
                  <div
                    className="fn-fill"
                    style={{ width: s.width + "%", background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- SOURCES + NATIONALITIES + ATTENTION ---------------- */}
      <div className="row-3">
        {/* sources donut */}
        <div className="card card-pad fade">
          <div className="card-h">
            <div>
              <h3 className="card-t">Enquiry sources</h3>
              <p className="card-d">Channel mix this period</p>
            </div>
          </div>
          <div className="donut-wrap" style={{ height: 168, marginTop: 6 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                >
                  {sources.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span className="n">{fmt(kpi.enquiries.v)}</span>
              <span className="l">enquiries</span>
            </div>
          </div>
          <div className="legend">
            {sources.map((s) => (
              <div className="lg-row" key={s.name}>
                <span className="lg-dot" style={{ background: s.color }} />
                <span className="lg-name">{s.name}</span>
                <span className="lg-val">
                  {Math.round((s.value / kpi.enquiries.v) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* nationalities */}
        <div className="card card-pad fade">
          <div className="card-h">
            <div>
              <h3 className="card-t">Where clients are from</h3>
              <p className="card-d">Top nationalities in the client base</p>
            </div>
          </div>
          <div className="hb">
            {NATS.map((nat, i) => {
              const pct = Math.round((nat.v / TOTAL) * 100);
              return (
                <div className="hb-row" key={nat.name}>
                  <div className="hb-top">
                    <span className="hb-name">{nat.name}</span>
                    <span className="hb-val">
                      <span className="mono">{fmt(nat.v)}</span> · {pct}%
                    </span>
                  </div>
                  <div className="hb-track">
                    <div
                      className="hb-fill"
                      style={{
                        width: pct + "%",
                        background: PALETTE[i % PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hb-foot">
            Across{" "}
            <span className="mono" style={{ color: "var(--ink-2)" }}>
              {fmt(TOTAL)}
            </span>{" "}
            total clients
          </div>
        </div>

        {/* needs attention */}
        <div className="card card-pad fade">
          <div className="card-h">
            <div>
              <h3 className="card-t">Needs attention</h3>
              <p className="card-d">Risks slowing the pipeline right now</p>
            </div>
          </div>
          <div className="att">
            {ATTN.map((a, i) => {
              const Ico = a.icon;
              return (
                <div className="att-row" key={i}>
                  <span className={"att-ico att-" + a.tone}>
                    <Ico size={16} />
                  </span>
                  <div className="att-body">
                    <div className="att-label">{a.label}</div>
                    <div className="att-cta">{a.cta} →</div>
                  </div>
                  <span className={"att-val " + a.valClass}>{a.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- PER-USER KPIs ---------------- */}
      <div className="fade">
        <UserKpiReport />
      </div>

      {/* ---------------- AGENT LEADERBOARD ---------------- */}
      <div className="card card-pad fade">
        <div className="card-h">
          <div>
            <h3 className="card-t">Agent leaderboard</h3>
            <p className="card-d">
              Ranked by performance score · click any column to sort
            </p>
          </div>
          <span className="ai-pill">
            <Trophy
              size={11}
              style={{ marginRight: 4, verticalAlign: "-1px" }}
            />
            {rangeLabel}
          </span>
        </div>

        <div className="lb-scroll">
          <table className="lb">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <SortHead k="name">Agent</SortHead>
                <SortHead k="enq" num>
                  Enquiries
                </SortHead>
                <SortHead k="leads" num>
                  Leads
                </SortHead>
                <SortHead k="clients" num>
                  Clients
                </SortHead>
                <SortHead k="conv" num>
                  Enq → Lead
                </SortHead>
                <SortHead k="activity" num>
                  Activity
                </SortHead>
                <SortHead k="rev" num>
                  Revenue
                </SortHead>
                <SortHead k="score" num>
                  Score
                </SortHead>
              </tr>
            </thead>
            <tbody>
              {agentsSorted.map((a, i) => (
                <tr key={a.name}>
                  <td>
                    <span className={"rank" + (i < 3 ? " r" + (i + 1) : "")}>
                      {i + 1}
                    </span>
                  </td>
                  <td>
                    <div className="agent-cell">
                      <span
                        className="avatar"
                        style={{
                          background:
                            AVATAR_COLORS[hash(a.name) % AVATAR_COLORS.length],
                        }}
                      >
                        {initials(a.name)}
                      </span>
                      <div>
                        <div className="agent-name">{a.name}</div>
                        <div className="agent-role">{a.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num">{fmt(a.enq)}</td>
                  <td className="num">{fmt(a.leads)}</td>
                  <td className="num">{fmt(a.clients)}</td>
                  <td className="num">
                    <span className="conv-pill">{a.conv.toFixed(1)}%</span>
                  </td>
                  <td className="num">{fmt(a.activity)}</td>
                  <td className="num">
                    {a.rev > 0 ? (
                      money(a.rev)
                    ) : (
                      <span className="rev-muted">$0</span>
                    )}
                  </td>
                  <td className="num">
                    <div className="score-cell">
                      <span className="score-track">
                        <span
                          className="score-fill"
                          style={{ width: a.score + "%" }}
                        />
                      </span>
                      <span className="score-n">{a.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lb-foot">
          <span>Showing top {agentsSorted.length} of 21 agents</span>
          <span>Activity = calls + logged actions in the selected window</span>
        </div>
      </div>

      {/* ---------------- TEAM ACTIVITY LEADERBOARD ---------------- */}
      <div className="card card-pad fade" style={{ marginTop: 16 }}>
        <div className="card-h">
          <div>
            <h3 className="card-t">Team activity</h3>
            <p className="card-d">
              Who is actually working the leads — logins and logged contact,{" "}
              {actView === "daily"
                ? "today"
                : actView === "weekly"
                  ? "last 7 days"
                  : "last 30 days"}{" "}
              · click any column to sort
            </p>
          </div>
          <div className="seg">
            {[
              ["daily", "Daily"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={actView === k ? "on" : ""}
                onClick={() => setActView(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="lb-scroll">
          <table className="lb">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <ActSortHead k="name">Agent</ActSortHead>
                <ActSortHead
                  k={actView === "daily" ? "started" : "activeDays"}
                  num={actView !== "daily"}
                >
                  {actView === "daily" ? "Started" : "Active days"}
                </ActSortHead>
                <ActSortHead k="call" num>
                  Calls
                </ActSortHead>
                <ActSortHead k="email" num>
                  Emails
                </ActSortHead>
                <ActSortHead k="spoken" num>
                  Spoken
                </ActSortHead>
                <ActSortHead k="note" num>
                  Notes
                </ActSortHead>
                <ActSortHead k="total" num>
                  Total
                </ActSortHead>
              </tr>
            </thead>
            <tbody>
              {actRows.map((a, i) => (
                <tr key={a.name}>
                  <td>
                    <span className={"rank" + (i < 3 ? " r" + (i + 1) : "")}>
                      {i + 1}
                    </span>
                  </td>
                  <td>
                    <div className="agent-cell">
                      <span
                        className="avatar"
                        style={{
                          background:
                            AVATAR_COLORS[hash(a.name) % AVATAR_COLORS.length],
                        }}
                      >
                        {initials(a.name)}
                      </span>
                      <div>
                        <div className="agent-name">{a.name}</div>
                        <div className="agent-role">{a.role}</div>
                      </div>
                    </div>
                  </td>
                  {actView === "daily" ? (
                    <td className="num">
                      {a.started ? (
                        <span className="start-pill">
                          <LogIn size={11} /> {timeStr(a.started)}
                        </span>
                      ) : (
                        <span className="rev-muted">—</span>
                      )}
                    </td>
                  ) : (
                    <td className="num">
                      {a.activeDays}
                      <span className="of-days"> / {actWindow}</span>
                    </td>
                  )}
                  <td className="num">{a.call}</td>
                  <td className="num">{a.email}</td>
                  <td className="num">{a.spoken}</td>
                  <td className="num">
                    {a.note > 0 ? (
                      <span className="note-pill">{a.note}</span>
                    ) : (
                      a.note
                    )}
                  </td>
                  <td className="num">
                    <b>{a.total}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lb-foot">
          <span>
            {actView === "daily"
              ? "“Started” = first action logged today (stands in for login time)"
              : "“Active days” = days with at least one logged action"}
          </span>
          <span>
            Sorted by{" "}
            {
              {
                name: "agent",
                started: "start time",
                activeDays: "active days",
                call: "calls",
                email: "emails",
                spoken: "spoken",
                note: "notes",
                total: "total activity",
              }[actSortKey]
            }
          </span>
        </div>
      </div>

    </div>
  );
}

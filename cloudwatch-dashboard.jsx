import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell
} from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const ACCOUNTS = {
  acc1: {
    id: "acc1",
    name: "Production",
    awsId: "123456789012",
    region: "us-east-1",
    health: 94,
    status: "healthy",
    services: ["EC2", "RDS", "Lambda", "ECS", "S3", "CloudFront", "API Gateway", "DynamoDB"],
    alerts: 2,
    cost: "$12,840",
    uptime: "99.97%",
  },
  acc2: {
    id: "acc2",
    name: "Staging",
    awsId: "987654321098",
    region: "eu-west-1",
    health: 78,
    status: "warning",
    services: ["EC2", "RDS", "Lambda", "S3", "API Gateway"],
    alerts: 5,
    cost: "$3,210",
    uptime: "99.12%",
  },
};

const SERVICE_METRICS = {
  acc1: {
    EC2: { cpu: 67, mem: 54, instances: 12, healthy: 11, status: "healthy", requests: "45K/min", errors: "0.12%", latency: "23ms" },
    RDS: { cpu: 42, mem: 71, instances: 3, healthy: 3, status: "healthy", requests: "8K/min", errors: "0.01%", latency: "4ms" },
    Lambda: { cpu: 23, mem: 31, instances: 847, healthy: 847, status: "healthy", requests: "120K/min", errors: "0.08%", latency: "145ms" },
    ECS: { cpu: 78, mem: 82, instances: 6, healthy: 5, status: "warning", requests: "22K/min", errors: "0.45%", latency: "67ms" },
    S3: { cpu: 5, mem: 10, instances: 1, healthy: 1, status: "healthy", requests: "200K/min", errors: "0.00%", latency: "8ms" },
    CloudFront: { cpu: 12, mem: 8, instances: 1, healthy: 1, status: "healthy", requests: "500K/min", errors: "0.02%", latency: "12ms" },
    "API Gateway": { cpu: 34, mem: 28, instances: 2, healthy: 2, status: "healthy", requests: "88K/min", errors: "0.21%", latency: "31ms" },
    DynamoDB: { cpu: 55, mem: 44, instances: 4, healthy: 3, status: "warning", requests: "35K/min", errors: "0.33%", latency: "9ms" },
  },
  acc2: {
    EC2: { cpu: 88, mem: 91, instances: 4, healthy: 3, status: "critical", requests: "12K/min", errors: "1.2%", latency: "145ms" },
    RDS: { cpu: 61, mem: 74, instances: 2, healthy: 2, status: "healthy", requests: "3K/min", errors: "0.05%", latency: "6ms" },
    Lambda: { cpu: 45, mem: 38, instances: 210, healthy: 210, status: "healthy", requests: "30K/min", errors: "0.11%", latency: "198ms" },
    S3: { cpu: 4, mem: 7, instances: 1, healthy: 1, status: "healthy", requests: "50K/min", errors: "0.00%", latency: "11ms" },
    "API Gateway": { cpu: 71, mem: 63, instances: 1, healthy: 1, status: "warning", requests: "18K/min", errors: "0.87%", latency: "89ms" },
  },
};

const genTimeSeries = (base, variance, points = 24) =>
  Array.from({ length: points }, (_, i) => ({
    t: `${String(i).padStart(2, "0")}:00`,
    v: Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance * 2)),
    v2: Math.max(0, Math.min(100, base * 0.8 + (Math.random() - 0.5) * variance * 1.5)),
  }));

const genRequestSeries = (base, points = 24) =>
  Array.from({ length: points }, (_, i) => ({
    t: `${String(i).padStart(2, "0")}:00`,
    req: Math.round(base + (Math.random() - 0.5) * base * 0.4),
    err: Math.round((base * 0.002) + Math.random() * base * 0.003),
  }));

// ─── THEME ────────────────────────────────────────────────────────────────────

const T = {
  bg: "#050b14",
  panel: "#0a1628",
  panelBorder: "#0f2040",
  accent: "#00d4ff",
  accentGlow: "rgba(0,212,255,0.15)",
  green: "#00ff9d",
  yellow: "#ffcc00",
  red: "#ff3d5a",
  text: "#c8daf0",
  textDim: "#4a6080",
  textBright: "#e8f4ff",
  grid: "#0d1f35",
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

const statusColor = (s) =>
  s === "healthy" ? T.green : s === "warning" ? T.yellow : T.red;

const statusLabel = (s) =>
  s === "healthy" ? "HEALTHY" : s === "warning" ? "WARNING" : "CRITICAL";

const GlowDot = ({ status, size = 8 }) => (
  <span style={{
    display: "inline-block",
    width: size, height: size,
    borderRadius: "50%",
    background: statusColor(status),
    boxShadow: `0 0 ${size}px ${statusColor(status)}`,
    flexShrink: 0,
  }} />
);

const MiniBar = ({ value, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 4, background: "#0d1f35", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        width: `${value}%`, height: "100%",
        background: value > 80 ? T.red : value > 60 ? T.yellow : color || T.accent,
        borderRadius: 2,
        transition: "width 0.8s ease",
        boxShadow: `0 0 6px ${value > 80 ? T.red : value > 60 ? T.yellow : color || T.accent}`,
      }} />
    </div>
    <span style={{ color: T.textDim, fontSize: 11, width: 32, textAlign: "right" }}>{value}%</span>
  </div>
);

const Panel = ({ children, style, glow }) => (
  <div style={{
    background: T.panel,
    border: `1px solid ${glow ? T.accent : T.panelBorder}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: glow ? `0 0 20px ${T.accentGlow}, inset 0 1px 0 rgba(0,212,255,0.1)` : "0 4px 24px rgba(0,0,0,0.4)",
    ...style,
  }}>
    {children}
  </div>
);

const Tag = ({ label, color }) => (
  <span style={{
    fontSize: 10, fontFamily: "'Courier New', monospace",
    letterSpacing: 1, padding: "2px 8px", borderRadius: 3,
    border: `1px solid ${color}22`, color, background: `${color}11`,
  }}>{label}</span>
);

const Breadcrumb = ({ layers, onNav }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
    {layers.map((l, i) => (
      <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {i > 0 && <span style={{ color: T.textDim, fontSize: 12 }}>›</span>}
        <span
          onClick={() => i < layers.length - 1 && onNav(i)}
          style={{
            fontSize: 12, fontFamily: "'Courier New', monospace",
            color: i === layers.length - 1 ? T.accent : T.textDim,
            cursor: i < layers.length - 1 ? "pointer" : "default",
            letterSpacing: 1,
            textDecoration: i < layers.length - 1 ? "underline" : "none",
            textUnderlineOffset: 3,
          }}
        >{l}</span>
      </span>
    ))}
  </div>
);

// ─── LAYER 1: ACCOUNT HEALTH OVERVIEW ────────────────────────────────────────

const AccountCard = ({ account, onClick }) => {
  const health = account.health;
  const arc = 2 * Math.PI * 36;
  const fill = (health / 100) * arc;
  const color = health > 90 ? T.green : health > 70 ? T.yellow : T.red;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.panel,
        border: `1px solid ${T.panelBorder}`,
        borderRadius: 16,
        padding: 28,
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid ${T.accent}`;
        e.currentTarget.style.boxShadow = `0 0 30px ${T.accentGlow}`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${T.panelBorder}`;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Background grid texture */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 20px)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 6 }}>AWS ACCOUNT</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.textBright, fontFamily: "'Georgia', serif", marginBottom: 4 }}>{account.name}</div>
          <div style={{ fontSize: 11, color: T.textDim, fontFamily: "'Courier New',monospace" }}>{account.awsId} · {account.region}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="36" fill="none" stroke="#0d1f35" strokeWidth="6" />
            <circle cx="45" cy="45" r="36" fill="none" stroke={color}
              strokeWidth="6" strokeDasharray={`${fill} ${arc}`}
              strokeLinecap="round" strokeDashoffset={arc / 4}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              transform="rotate(-90 45 45)"
            />
            <text x="45" y="42" textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="'Courier New',monospace">{health}</text>
            <text x="45" y="57" textAnchor="middle" fill={T.textDim} fontSize="10" fontFamily="'Courier New',monospace">HEALTH</text>
          </svg>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { l: "UPTIME", v: account.uptime, c: T.green },
          { l: "ALERTS", v: account.alerts, c: account.alerts > 3 ? T.red : account.alerts > 0 ? T.yellow : T.green },
          { l: "COST / MO", v: account.cost, c: T.accent },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: "#060e1a", borderRadius: 8, padding: "12px 14px", border: `1px solid ${T.grid}` }}>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: "'Courier New',monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {account.services.slice(0, 5).map(s => <Tag key={s} label={s} color={T.accent} />)}
          {account.services.length > 5 && <Tag label={`+${account.services.length - 5}`} color={T.textDim} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GlowDot status={account.status} />
          <span style={{ fontSize: 11, color: statusColor(account.status), fontFamily: "'Courier New',monospace", letterSpacing: 1 }}>
            {statusLabel(account.status)}
          </span>
        </div>
      </div>
    </div>
  );
};

const Layer1 = ({ onDrill }) => {
  const totalAlerts = Object.values(ACCOUNTS).reduce((s, a) => s + a.alerts, 0);
  const avgHealth = Math.round(Object.values(ACCOUNTS).reduce((s, a) => s + a.health, 0) / 2);

  const activityData = genTimeSeries(65, 20, 24);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, color: T.accent, letterSpacing: 4, fontFamily: "'Courier New',monospace", marginBottom: 8 }}>
          CLOUDWATCH UNIFIED CONSOLE
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: T.textBright, fontFamily: "'Georgia',serif", margin: 0, lineHeight: 1 }}>
            Account Health<br />
            <span style={{ color: T.accent }}>Overview</span>
          </h1>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.textDim, fontFamily: "'Courier New',monospace" }}>LAST UPDATED</div>
            <div style={{ fontSize: 13, color: T.accent, fontFamily: "'Courier New',monospace" }}>
              {new Date().toLocaleTimeString()} UTC
            </div>
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "ACCOUNTS MONITORED", value: "2", sub: "Multi-region", color: T.accent },
          { label: "AVG HEALTH SCORE", value: `${avgHealth}%`, sub: "Across all services", color: avgHealth > 85 ? T.green : T.yellow },
          { label: "ACTIVE ALERTS", value: totalAlerts, sub: "Requires attention", color: totalAlerts > 5 ? T.red : T.yellow },
          { label: "TOTAL SERVICES", value: "13", sub: "Distributed workloads", color: T.green },
        ].map(({ label, value, sub, color }) => (
          <Panel key={label}>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2.5, fontFamily: "'Courier New',monospace", marginBottom: 10 }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "'Courier New',monospace", lineHeight: 1, marginBottom: 6 }}>{value}</div>
            <div style={{ fontSize: 11, color: T.textDim }}>{sub}</div>
          </Panel>
        ))}
      </div>

      {/* Account Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {Object.values(ACCOUNTS).map(acc => (
          <AccountCard key={acc.id} account={acc} onClick={() => onDrill(acc.id)} />
        ))}
      </div>

      {/* Combined activity chart */}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>COMBINED ACTIVITY</div>
            <div style={{ fontSize: 16, color: T.textBright, fontWeight: 600 }}>Cross-Account Resource Utilisation · 24h</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[{ l: "Production", c: T.accent }, { l: "Staging", c: T.yellow }].map(({ l, c }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 2, background: c, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: T.textDim }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.yellow} stopOpacity={0.3} />
                <stop offset="95%" stopColor={T.yellow} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
            <XAxis dataKey="t" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 8, color: T.text }} />
            <Area type="monotone" dataKey="v" stroke={T.accent} fill="url(#g1)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="v2" stroke={T.yellow} fill="url(#g2)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
};

// ─── LAYER 2: SERVICE LIST FOR ACCOUNT ───────────────────────────────────────

const ServiceRow = ({ name, metrics, onClick }) => {
  const s = metrics.status;
  return (
    <div
      onClick={onClick}
      style={{
        background: "#060e1a",
        border: `1px solid ${T.panelBorder}`,
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "grid",
        gridTemplateColumns: "180px 1fr 1fr 120px 120px 120px 100px",
        alignItems: "center",
        gap: 16,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = statusColor(s);
        e.currentTarget.style.background = `${statusColor(s)}08`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = T.panelBorder;
        e.currentTarget.style.background = "#060e1a";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <GlowDot status={s} size={7} />
        <span style={{ fontWeight: 700, color: T.textBright, fontSize: 14 }}>{name}</span>
      </div>
      <div>
        <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>CPU</div>
        <MiniBar value={metrics.cpu} />
      </div>
      <div>
        <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>MEMORY</div>
        <MiniBar value={metrics.mem} color={T.green} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>REQUESTS</div>
        <div style={{ fontSize: 13, color: T.accent, fontFamily: "'Courier New',monospace" }}>{metrics.requests}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>LATENCY</div>
        <div style={{ fontSize: 13, color: T.textBright, fontFamily: "'Courier New',monospace" }}>{metrics.latency}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>ERRORS</div>
        <div style={{ fontSize: 13, color: parseFloat(metrics.errors) > 0.5 ? T.red : T.green, fontFamily: "'Courier New',monospace" }}>{metrics.errors}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Tag label={statusLabel(s)} color={statusColor(s)} />
      </div>
    </div>
  );
};

const Layer2 = ({ accountId, onDrill, onBack }) => {
  const acc = ACCOUNTS[accountId];
  const services = SERVICE_METRICS[accountId];

  const healthy = Object.values(services).filter(s => s.status === "healthy").length;
  const warning = Object.values(services).filter(s => s.status === "warning").length;
  const critical = Object.values(services).filter(s => s.status === "critical").length;

  const pieData = [
    { name: "Healthy", value: healthy, color: T.green },
    { name: "Warning", value: warning, color: T.yellow },
    { name: "Critical", value: critical, color: T.red },
  ].filter(d => d.value > 0);

  return (
    <div>
      <Breadcrumb
        layers={["Account Overview", `${acc.name} Services`]}
        onNav={(i) => i === 0 && onBack()}
      />

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: T.accent, letterSpacing: 4, fontFamily: "'Courier New',monospace", marginBottom: 8 }}>
          {acc.awsId} · {acc.region}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: T.textBright, fontFamily: "'Georgia',serif", margin: 0 }}>
            {acc.name} <span style={{ color: T.accent }}>Services</span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <GlowDot status={acc.status} size={10} />
            <span style={{ color: statusColor(acc.status), fontFamily: "'Courier New',monospace", fontSize: 13, letterSpacing: 1 }}>
              {statusLabel(acc.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Account-level stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 240px", gap: 16, marginBottom: 28 }}>
        {[
          { l: "HEALTH SCORE", v: `${acc.health}%`, c: acc.health > 85 ? T.green : T.yellow },
          { l: "TOTAL SERVICES", v: Object.keys(services).length, c: T.accent },
          { l: "ACTIVE ALERTS", v: acc.alerts, c: acc.alerts > 3 ? T.red : T.yellow },
        ].map(({ l, v, c }) => (
          <Panel key={l}>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2.5, fontFamily: "'Courier New',monospace", marginBottom: 8 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c, fontFamily: "'Courier New',monospace" }}>{v}</div>
          </Panel>
        ))}
        <Panel>
          <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2.5, fontFamily: "'Courier New',monospace", marginBottom: 8 }}>SERVICE STATUS</div>
          <div style={{ display: "flex", height: 80, alignItems: "center", justifyContent: "space-between" }}>
            <PieChart width={80} height={80}>
              <Pie data={pieData} cx={35} cy={35} innerRadius={22} outerRadius={36} dataKey="value" strokeWidth={0}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[{ l: "Healthy", v: healthy, c: T.green }, { l: "Warning", v: warning, c: T.yellow }, { l: "Critical", v: critical, c: T.red }].map(({ l, v, c }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 11, color: T.textDim }}>{l}: </span>
                  <span style={{ fontSize: 11, color: c, fontFamily: "'Courier New',monospace", fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr 1fr 120px 120px 120px 100px",
        gap: 16, padding: "8px 20px", marginBottom: 8,
      }}>
        {["SERVICE", "CPU UTILISATION", "MEMORY USAGE", "REQUESTS", "LATENCY", "ERROR RATE", "STATUS"].map(h => (
          <div key={h} style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>{h}</div>
        ))}
      </div>

      {/* Service rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(services).map(([name, metrics]) => (
          <ServiceRow key={name} name={name} metrics={metrics} onClick={() => onDrill(name)} />
        ))}
      </div>
    </div>
  );
};

// ─── LAYER 3: SERVICE DEEP DIVE ───────────────────────────────────────────────

const Layer3 = ({ accountId, serviceName, onBack, onBackToLayer1 }) => {
  const acc = ACCOUNTS[accountId];
  const metrics = SERVICE_METRICS[accountId][serviceName];

  const cpuData = genTimeSeries(metrics.cpu, 15, 48);
  const memData = genTimeSeries(metrics.mem, 12, 48);
  const reqData = genRequestSeries(parseInt(metrics.requests) * 0.7, 48);

  const latencyHist = Array.from({ length: 12 }, (_, i) => ({
    bucket: `${i * 25}-${(i + 1) * 25}ms`,
    count: Math.round(Math.random() * 1000 + (i < 4 ? 800 : i < 8 ? 400 : 100)),
  }));

  return (
    <div>
      <Breadcrumb
        layers={["Account Overview", `${acc.name} Services`, serviceName]}
        onNav={(i) => { if (i === 0) onBackToLayer1(); else if (i === 1) onBack(); }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, color: T.accent, letterSpacing: 4, fontFamily: "'Courier New',monospace", marginBottom: 8 }}>
            {acc.awsId} · {acc.region} · {acc.name}
          </div>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: T.textBright, fontFamily: "'Georgia',serif", margin: 0, marginBottom: 8 }}>
            {serviceName} <span style={{ color: T.accent }}>Deep Dive</span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GlowDot status={metrics.status} size={10} />
            <span style={{ color: statusColor(metrics.status), fontFamily: "'Courier New',monospace", fontSize: 13, letterSpacing: 1 }}>
              {statusLabel(metrics.status)}
            </span>
            <span style={{ color: T.textDim, fontSize: 12 }}>·</span>
            <span style={{ color: T.textDim, fontSize: 12, fontFamily: "'Courier New',monospace" }}>
              {metrics.healthy}/{metrics.instances} instances healthy
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { l: "REQUESTS", v: metrics.requests, c: T.accent },
            { l: "LATENCY P50", v: metrics.latency, c: T.textBright },
            { l: "ERROR RATE", v: metrics.errors, c: parseFloat(metrics.errors) > 0.5 ? T.red : T.green },
            { l: "INSTANCES", v: `${metrics.healthy}/${metrics.instances}`, c: metrics.healthy === metrics.instances ? T.green : T.yellow },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: "#060e1a", border: `1px solid ${T.panelBorder}`, borderRadius: 8, padding: "10px 14px", minWidth: 120 }}>
              <div style={{ fontSize: 8, color: T.textDim, letterSpacing: 2, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c, fontFamily: "'Courier New',monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CPU + Memory time series */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {[
          { title: "CPU Utilisation", data: cpuData, color: T.accent, gid: "cpu" },
          { title: "Memory Usage", data: memData, color: T.green, gid: "mem" },
        ].map(({ title, data, color, gid }) => (
          <Panel key={title}>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>48H TREND</div>
            <div style={{ fontSize: 15, color: T.textBright, fontWeight: 600, marginBottom: 16 }}>{title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Courier New',monospace" }}>
                  {data[data.length - 1].v.toFixed(1)}
                </span>
                <span style={{ fontSize: 14, color: T.textDim, marginLeft: 4 }}>%</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: T.textDim }}>AVG</div>
                <div style={{ fontSize: 14, color: T.textDim, fontFamily: "'Courier New',monospace" }}>
                  {(data.reduce((s, d) => s + d.v, 0) / data.length).toFixed(1)}%
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
                <XAxis dataKey="t" tick={{ fill: T.textDim, fontSize: 9 }} axisLine={false} tickLine={false} interval={7} />
                <YAxis tick={{ fill: T.textDim, fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 8, color: T.text, fontSize: 11 }} />
                <Area type="monotone" dataKey="v" stroke={color} fill={`url(#${gid})`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        ))}
      </div>

      {/* Request rate + Error chart */}
      <Panel style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>48H TREND</div>
            <div style={{ fontSize: 15, color: T.textBright, fontWeight: 600 }}>Request Volume & Errors</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[{ l: "Requests", c: T.accent }, { l: "Errors", c: T.red }].map(({ l, c }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 16, height: 2, background: c }} />
                <span style={{ fontSize: 11, color: T.textDim }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={reqData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
            <XAxis dataKey="t" tick={{ fill: T.textDim, fontSize: 9 }} axisLine={false} tickLine={false} interval={7} />
            <YAxis yAxisId="req" tick={{ fill: T.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="err" orientation="right" tick={{ fill: T.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 8, color: T.text, fontSize: 11 }} />
            <Line yAxisId="req" type="monotone" dataKey="req" stroke={T.accent} strokeWidth={2} dot={false} />
            <Line yAxisId="err" type="monotone" dataKey="err" stroke={T.red} strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Latency histogram + instance health */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
        <Panel>
          <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>DISTRIBUTION</div>
          <div style={{ fontSize: 15, color: T.textBright, fontWeight: 600, marginBottom: 16 }}>Latency Histogram (ms)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={latencyHist}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: T.textDim, fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 8, color: T.text, fontSize: 11 }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {latencyHist.map((_, i) => (
                  <Cell key={i} fill={i < 4 ? T.green : i < 8 ? T.accent : T.yellow} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel>
          <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 3, fontFamily: "'Courier New',monospace", marginBottom: 4 }}>INSTANCE HEALTH</div>
          <div style={{ fontSize: 15, color: T.textBright, fontWeight: 600, marginBottom: 20 }}>Instance Status</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              {Array.from({ length: metrics.instances }, (_, i) => {
                const angle = (i / metrics.instances) * Math.PI * 2 - Math.PI / 2;
                const r = 48;
                const x = 65 + r * Math.cos(angle);
                const y = 65 + r * Math.sin(angle);
                const healthy = i < metrics.healthy;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={10} fill={healthy ? `${T.green}22` : `${T.red}22`} stroke={healthy ? T.green : T.red} strokeWidth={1.5} />
                    <circle cx={x} cy={y} r={3} fill={healthy ? T.green : T.red}
                      style={{ filter: `drop-shadow(0 0 4px ${healthy ? T.green : T.red})` }} />
                  </g>
                );
              })}
              <text x="65" y="60" textAnchor="middle" fill={T.textBright} fontSize="22" fontWeight="800" fontFamily="'Courier New',monospace">{metrics.healthy}</text>
              <text x="65" y="76" textAnchor="middle" fill={T.textDim} fontSize="11" fontFamily="'Courier New',monospace">of {metrics.instances}</text>
              <text x="65" y="92" textAnchor="middle" fill={T.green} fontSize="9" fontFamily="'Courier New',monospace" letterSpacing="2">HEALTHY</text>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: Math.min(metrics.instances, 6) }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "#060e1a", borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'Courier New',monospace" }}>i-{(Math.random() * 1e8 | 0).toString(16).padStart(8, "0")}</span>
                <GlowDot status={i < metrics.healthy ? "healthy" : "critical"} size={6} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [layer, setLayer] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const scrollRef = useRef(null);

  const nav = (l) => { setLayer(l); scrollRef.current?.scrollTo(0, 0); };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 2, background: T.accent,
        boxShadow: `0 0 80px 20px ${T.accentGlow}`, pointerEvents: "none", zIndex: 0,
      }} />

      {/* Top nav bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${T.bg}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.panelBorder}`,
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 28, height: 28 }}>
            <svg viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill={T.accent} opacity="0.9" />
              <rect x="16" y="2" width="10" height="10" rx="2" fill={T.accent} opacity="0.5" />
              <rect x="2" y="16" width="10" height="10" rx="2" fill={T.accent} opacity="0.5" />
              <rect x="16" y="16" width="10" height="10" rx="2" fill={T.accent} opacity="0.9" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textBright, letterSpacing: 0.5 }}>CloudWatch</span>
          <span style={{ fontSize: 13, color: T.textDim }}>Unified Dashboard</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[
            { n: 1, l: "Account Health" },
            { n: 2, l: "Services" },
            { n: 3, l: "Service Detail" },
          ].map(({ n, l }) => (
            <button
              key={n}
              onClick={() => {
                if (n === 1) nav(1);
                else if (n === 2 && selectedAccount) nav(2);
                else if (n === 3 && selectedService) nav(3);
              }}
              style={{
                background: layer === n ? `${T.accent}18` : "transparent",
                border: `1px solid ${layer === n ? T.accent : "transparent"}`,
                borderRadius: 6, padding: "5px 14px",
                color: layer === n ? T.accent : T.textDim,
                fontSize: 12, cursor: "pointer",
                fontFamily: "'Courier New',monospace", letterSpacing: 0.5,
                opacity: n > layer && !(n === 2 && selectedAccount) && !(n === 3 && selectedService) ? 0.4 : 1,
              }}
            >
              L{n} · {l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}`, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'Courier New',monospace" }}>LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 64px" }}>
        {layer === 1 && (
          <Layer1 onDrill={(accId) => {
            setSelectedAccount(accId);
            setSelectedService(null);
            nav(2);
          }} />
        )}
        {layer === 2 && selectedAccount && (
          <Layer2
            accountId={selectedAccount}
            onDrill={(svc) => { setSelectedService(svc); nav(3); }}
            onBack={() => nav(1)}
          />
        )}
        {layer === 3 && selectedAccount && selectedService && (
          <Layer3
            accountId={selectedAccount}
            serviceName={selectedService}
            onBack={() => nav(2)}
            onBackToLayer1={() => nav(1)}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.panelBorder}; border-radius: 3px; }
      `}</style>
    </div>
  );
}

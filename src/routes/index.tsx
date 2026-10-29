import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen Player — Pro Local Video Player" },
      { name: "description", content: "Play local videos with professional color grading controls." },
      { property: "og:title", content: "Lumen Player" },
      { property: "og:description", content: "Play local videos with professional color grading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Player,
});

type Grade = { brightness: number; contrast: number; saturate: number; hue: number; sepia: number; gamma: number; temp: number };
const DEF: Grade = { brightness: 100, contrast: 100, saturate: 100, hue: 0, sepia: 0, gamma: 100, temp: 0 };
const PRESETS: Record<string, Grade> = {
  Original: DEF,
  Cinematic: { ...DEF, contrast: 120, saturate: 85, temp: -10, brightness: 95 },
  Vivid: { ...DEF, contrast: 115, saturate: 150 },
  Warm: { ...DEF, temp: 25, saturate: 110 },
  Noir: { ...DEF, saturate: 0, contrast: 140 },
  Vintage: { ...DEF, sepia: 45, contrast: 90, brightness: 105 },
};
const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
};

function Player() {
  const v = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<{ name: string; url: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  const [vol, setVol] = useState(1);
  const [rate, setRate] = useState(1);
  const [g, setG] = useState<Grade>(DEF);
  const [panel, setPanel] = useState(false);
  const [fit, setFit] = useState<"contain" | "cover">("contain");

  useEffect(() => {
    try { const s = localStorage.getItem("lumen-grade"); if (s) setG(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("lumen-grade", JSON.stringify(g)); }, [g]);

  const onFiles = (fl: FileList | null) => {
    if (!fl) return;
    const items = Array.from(fl).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setList((p) => [...p, ...items]);
    if (!list.length) setIdx(0);
  };
  const cur = list[idx];
  const toggle = () => { const e = v.current; if (!e) return; e.paused ? e.play() : e.pause(); };
  const seek = (s: number) => { if (v.current) v.current.currentTime = Math.max(0, Math.min(d, v.current.currentTime + s)); };
  const fs = async () => {
    const el = wrap.current as any;
    if (document.fullscreenElement) document.exitFullscreen();
    else { await el?.requestFullscreen?.(); try { await (screen.orientation as any)?.lock?.("landscape"); } catch {} }
  };
  const filter = `brightness(${(g.brightness * g.gamma) / 100}%) contrast(${g.contrast}%) saturate(${g.saturate}%) hue-rotate(${g.hue + g.temp * -0.3}deg) sepia(${g.sepia + Math.max(0, g.temp) * 0.6}%)`;

  const sliders: [keyof Grade, string, number, number][] = [
    ["brightness", "Exposure", 30, 200], ["contrast", "Contrast", 30, 200], ["gamma", "Gamma", 50, 150],
    ["saturate", "Saturation", 0, 250], ["temp", "Temperature", -50, 50], ["hue", "Hue", -180, 180], ["sepia", "Tone", 0, 100],
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <h1 className="font-display text-lg tracking-widest">LUMEN<span className="text-primary">.</span></h1>
        <label className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          + Open videos
          <input type="file" accept="video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </label>
      </header>

      <div ref={wrap} className="relative bg-stage aspect-video w-full lg:max-h-[70vh] flex items-center justify-center overflow-hidden">
        {cur ? (
          <video
            ref={v} src={cur.url} playsInline onClick={toggle}
            className="h-full w-full" style={{ filter, objectFit: fit }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => { setD(e.currentTarget.duration); e.currentTarget.playbackRate = rate; e.currentTarget.volume = vol; e.currentTarget.play().catch(() => {}); }}
            onEnded={() => idx < list.length - 1 && setIdx(idx + 1)}
          />
        ) : (
          <label className="flex flex-col items-center gap-3 text-muted-foreground cursor-pointer p-8 text-center">
            <div className="h-16 w-16 rounded-full border-2 border-primary flex items-center justify-center text-primary text-2xl">▶</div>
            <span>Tap to choose videos from your device</span>
            <input type="file" accept="video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </label>
        )}
      </div>

      {cur && (
        <section className="px-4 py-3 space-y-3 border-b border-border">
          <p className="truncate text-sm text-muted-foreground">{cur.name}</p>
          <input type="range" min={0} max={d || 0} step={0.1} value={t} onChange={(e) => { if (v.current) v.current.currentTime = +e.target.value; }} className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground font-mono"><span>{fmt(t)}</span><span>{fmt(d)}</span></div>
          <div className="flex items-center justify-center gap-3">
            <Btn onClick={() => setIdx(Math.max(0, idx - 1))}>⏮</Btn>
            <Btn onClick={() => seek(-10)}>-10</Btn>
            <button onClick={toggle} className="h-14 w-14 rounded-full bg-primary text-primary-foreground text-xl">{playing ? "❚❚" : "▶"}</button>
            <Btn onClick={() => seek(10)}>+10</Btn>
            <Btn onClick={() => setIdx(Math.min(list.length - 1, idx + 1))}>⏭</Btn>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span>🔊</span>
            <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { setVol(+e.target.value); if (v.current) v.current.volume = +e.target.value; }} className="w-24 accent-primary" />
            <select value={rate} onChange={(e) => { setRate(+e.target.value); if (v.current) v.current.playbackRate = +e.target.value; }} className="rounded-md bg-secondary px-2 py-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>
            <Btn onClick={() => setFit(fit === "contain" ? "cover" : "contain")}>{fit === "contain" ? "Fit" : "Fill"}</Btn>
            <Btn onClick={() => setPanel(!panel)} active={panel}>🎨 Color</Btn>
            <Btn onClick={fs}>⛶</Btn>
          </div>
        </section>
      )}

      {panel && (
        <section className="px-4 py-4 space-y-4 border-b border-border bg-card">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(PRESETS).map(([n, p]) => (
              <button key={n} onClick={() => setG(p)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:border-primary">{n}</button>
            ))}
          </div>
          {sliders.map(([k, label, min, max]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-mono text-primary">{g[k]}</span></div>
              <input type="range" min={min} max={max} value={g[k]} onChange={(e) => setG({ ...g, [k]: +e.target.value })} onDoubleClick={() => setG({ ...g, [k]: DEF[k] })} className="w-full accent-primary" />
            </div>
          ))}
          <button onClick={() => setG(DEF)} className="w-full rounded-md bg-secondary py-2 text-sm">Reset all</button>
        </section>
      )}

      {list.length > 0 && (
        <section className="px-4 py-3 space-y-1" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Playlist</h2>
          {list.map((it, i) => (
            <button key={it.url} onClick={() => setIdx(i)} className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm ${i === idx ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}>
              {i + 1}. {it.name}
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

function Btn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button onClick={onClick} className={`rounded-md px-3 py-2 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{children}</button>;
}

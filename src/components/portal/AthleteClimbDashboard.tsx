import React from "react";
import { Home as HomeIcon, TrendingUp, Target, User as UserIcon } from "lucide-react";
import type { Athlete } from "@/hooks/usePortalData";
import { useMonthlyReviews } from "@/hooks/usePortalData";

/**
 * Athlete "Climb" dashboard (17-20 cohort).
 * Mockup-faithful, scoped via .climb-app class to avoid leaking styles.
 */
export default function AthleteClimbDashboard({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];

  const firstName = athlete.name.split(" ")[0] || athlete.name;
  const lastName = athlete.name.split(" ").slice(1).join(" ");
  const initials = (firstName[0] || "") + (lastName[0] || "");
  const agentInitials = (athlete.assignedAgent || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const focus = review?.focus && review.focus !== "—" ? review.focus : "Keep stacking weeks. The window is open.";

  // Placeholder ladder — to be wired to pathway data later.
  const ladder = [
    { lvl: "NRL First Grade", meta: "The top squad", tag: "THE GOAL", state: "goal" },
    { lvl: "NSW Cup", meta: "Knocking on the door — needs consistent minutes", tag: "NEXT", state: "next" },
    { lvl: athlete.club || "Jersey Flegg", meta: "Where you are now", tag: "YOU ARE HERE", state: "here" },
    { lvl: "SG Ball", meta: "Cleared", tag: "DONE", state: "done" },
  ];

  // Placeholder gaps
  const gaps = [
    { name: "NSW Cup minutes", progress: "2 of 5 games", pct: 40, note: "Coaches want to see you hold up over 60+ minutes at the level." },
    { name: "Add 4kg lean size", progress: "+2.5kg", pct: 62, note: "Strength block is working — keep the program tight." },
    { name: "Defensive reads at speed", progress: "Tracking", pct: 75, note: "Big improvement on tape this month. Nearly there." },
  ];

  // Placeholder recent form
  const form = [
    { score: "8.1", opp: "vs Souths" },
    { score: "7.4", opp: "vs Manly" },
    { score: "8.6", opp: "vs Storm", hot: true },
    { score: "7.0", opp: "vs Eels" },
    { score: "8.3", opp: "vs Roosters" },
  ];

  return (
    <>
      <style>{climbCss}</style>
      <div className="climb-app">
        <div className="app">
          {/* Top bar */}
          <div className="bar">
            <div className="crest">
              <span className="w">Eleva</span>
            </div>
            <div className="ico" aria-hidden>
              <span style={{ fontSize: 11, color: "var(--soft)" }}>{initials.toUpperCase()}</span>
            </div>
          </div>

          <div className="content">
            {/* HERO */}
            <div className="hero">
              <div className="status">
                <span className="live" />
                ON THE CHARGE
              </div>
              <div className="face">
                {athlete.photoUrl ? (
                  <img src={athlete.photoUrl} alt={athlete.name} />
                ) : (
                  <span>{initials.toUpperCase()}</span>
                )}
              </div>
              <div className="pos">{athlete.position || "Athlete"}</div>
              <h1>
                {firstName}
                {lastName ? <><br />{lastName}</> : null}
              </h1>
              <div className="club">
                {athlete.club || "—"}
                <span className="dot" />
                {athlete.stage}
                {athlete.age ? <><span className="dot" />{athlete.age}y</> : null}
              </div>

              <div className="gapbanner">
                <div className="big">2</div>
                <div>
                  <div className="gt">rungs from the top squad</div>
                  <div className="gs">NSW Cup minutes are the next step — you're close.</div>
                </div>
              </div>
            </div>

            <div className="zone-main">
              {/* Ladder */}
              <div className="sh">
                <div className="t">
                  <span className="bar3"><i /><i /><i /></span>
                  Your climb
                </div>
              </div>
              <div className="ladder">
                {ladder.map((r, i) => (
                  <React.Fragment key={i}>
                    <div className={`rung ${r.state}`}>
                      <div className="node" />
                      <div>
                        <div className="lvl">{r.lvl}</div>
                        <div className="meta">{r.meta}</div>
                      </div>
                      <div className="tag">{r.tag}</div>
                    </div>
                    {i < ladder.length - 1 && <div className="connector" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Recent form */}
              <div className="sh">
                <div className="t">
                  <span className="bar3"><i /><i /><i /></span>
                  Recent form
                </div>
              </div>
              <div className="form">
                {form.map((f, i) => (
                  <div key={i} className="fg">
                    <div className={`fr ${f.hot ? "hot" : ""}`}>{f.score}</div>
                    <div className="fo">{f.opp}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="zone-side">
              {/* Gaps */}
              <div className="sh">
                <div className="t">
                  <span className="bar3"><i /><i /><i /></span>
                  What's between you & the top
                </div>
              </div>
              {gaps.map((g, i) => (
                <div key={i} className="gap">
                  <div className="gh">
                    <div className="gn">{g.name}</div>
                    <div className="gp">{g.progress}</div>
                  </div>
                  <div className="track"><i style={{ width: `${g.pct}%` }} /></div>
                  <div className="gd">{g.note}</div>
                </div>
              ))}

              {/* Belief / agent quote */}
              <div className="belief">
                <div className="bh">
                  <div className="av">{agentInitials || "—"}</div>
                  <div className="who">
                    <div className="n">{athlete.assignedAgent}</div>
                    <div className="r">Your agent</div>
                  </div>
                </div>
                <div className="quote">
                  "{firstName} — <span className="hl">{focus}</span> This is the window — let's take it."
                </div>
              </div>
            </div>
          </div>

          {/* Tabbar */}
          <div className="tabbar">
            <div className="tb on"><HomeIcon /><span>Home</span></div>
            <div className="tb"><TrendingUp /><span>My climb</span></div>
            <div className="tb"><Target /><span>Goals</span></div>
            <div className="tb"><UserIcon /><span>Me</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

const climbCss = `
.climb-app{
  --ink:#080C13; --ink-2:#0E141F; --card:#131B27; --line:#243245;
  --gold:#C9A35B; --gold-lite:#E9CE91; --gold-deep:#9A7B36;
  --spark:#37E089;
  --soft:#AAB6C6; --hint:#6B7889;
  --display:'Fraunces',serif; --body:'Geist',system-ui,sans-serif; --mono:'Geist Mono',monospace;
  font-family:var(--body);
  background:#05080D;
  min-height:100vh;
  display:flex;justify-content:center;
  padding:20px 14px 50px;
  -webkit-font-smoothing:antialiased;
}
.climb-app .app{width:100%;max-width:440px;background:var(--ink);border-radius:28px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55);position:relative}
.climb-app .bar{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 12px}
.climb-app .bar .crest{display:flex;align-items:center;gap:9px}
.climb-app .bar .crest .w{font-family:var(--display);font-weight:500;font-size:17px;color:#fff}
.climb-app .bar .ico{width:36px;height:36px;border-radius:50%;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--soft)}
.climb-app .content{padding:0 14px}

.climb-app .hero{position:relative;border-radius:24px;overflow:hidden;
  background:radial-gradient(130% 100% at 80% 0%, #233247 0%, #131C29 46%, #0C121B 100%);
  border:1px solid var(--line);padding:22px}
.climb-app .hero::before{content:"";position:absolute;right:-50px;top:-50px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(201,163,91,.26),transparent 62%)}
.climb-app .hero .status{position:relative;display:inline-flex;align-items:center;gap:7px;background:rgba(201,163,91,.13);border:1px solid rgba(201,163,91,.32);color:var(--gold-lite);font-size:11px;font-weight:600;letter-spacing:.4px;padding:5px 11px;border-radius:99px;margin-bottom:48px}
.climb-app .hero .status .live{width:7px;height:7px;border-radius:50%;background:var(--gold-lite);animation:climbPulse 2s infinite}
@keyframes climbPulse{0%{box-shadow:0 0 0 0 rgba(233,206,145,.5)}70%{box-shadow:0 0 0 9px rgba(233,206,145,0)}100%{box-shadow:0 0 0 0 rgba(233,206,145,0)}}

.climb-app .hero .pos{position:relative;font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--gold-lite);text-transform:uppercase;margin-bottom:5px}
.climb-app .hero h1{position:relative;font-weight:800;font-size:38px;line-height:.98;letter-spacing:-1.4px;color:#fff;margin-bottom:10px}
.climb-app .hero .club{position:relative;font-size:13.5px;color:var(--soft);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.climb-app .hero .club .dot{width:3px;height:3px;border-radius:50%;background:var(--hint)}

.climb-app .hero .face{position:absolute;top:20px;right:20px;width:62px;height:62px;border-radius:16px;
  background:linear-gradient(150deg,var(--gold-lite),var(--gold-deep));display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:22px;color:#1c1404;border:2px solid rgba(255,255,255,.15);overflow:hidden}
.climb-app .hero .face img{width:100%;height:100%;object-fit:cover}

.climb-app .gapbanner{position:relative;margin-top:18px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px}
.climb-app .gapbanner .big{font-weight:800;font-size:30px;color:var(--gold-lite);letter-spacing:-1px;line-height:1}
.climb-app .gapbanner .gt{font-size:13px;color:#fff;font-weight:600;line-height:1.3}
.climb-app .gapbanner .gs{font-size:11.5px;color:var(--hint);margin-top:2px}

.climb-app .sh{display:flex;align-items:center;justify-content:space-between;padding:22px 6px 12px}
.climb-app .sh .t{font-weight:700;font-size:15px;color:#fff;display:flex;align-items:center;gap:9px}
.climb-app .sh .t .bar3{display:flex;gap:2px;align-items:flex-end;height:15px}
.climb-app .sh .t .bar3 i{width:3px;border-radius:1px;background:var(--gold)}
.climb-app .sh .t .bar3 i:nth-child(1){height:6px}
.climb-app .sh .t .bar3 i:nth-child(2){height:15px}
.climb-app .sh .t .bar3 i:nth-child(3){height:10px}

.climb-app .ladder{padding:0 6px}
.climb-app .rung{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);margin-bottom:9px;position:relative}
.climb-app .rung .lvl{font-weight:700;font-size:14px;color:#fff}
.climb-app .rung .meta{font-size:11.5px;color:var(--hint);margin-top:2px}
.climb-app .rung .tag{margin-left:auto;font-size:10.5px;font-weight:600;letter-spacing:.4px;padding:4px 9px;border-radius:99px;white-space:nowrap}
.climb-app .rung .node{width:14px;height:14px;border-radius:50%;border:2px solid var(--line);flex-shrink:0;background:var(--ink)}
.climb-app .rung.goal{background:linear-gradient(135deg,#1d2233,#11151f);border-color:#2c3650}
.climb-app .rung.goal .lvl{color:var(--soft)}
.climb-app .rung.goal .node{border-color:var(--gold-deep)}
.climb-app .rung.goal .tag{background:rgba(201,163,91,.12);color:var(--gold-lite)}
.climb-app .rung.next{border-color:rgba(201,163,91,.4)}
.climb-app .rung.next .tag{background:rgba(201,163,91,.14);color:var(--gold-lite)}
.climb-app .rung.next .node{border-color:var(--gold);background:var(--gold-deep)}
.climb-app .rung.here{background:linear-gradient(135deg,#2a2410,#1a1608);border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 8px 24px rgba(201,163,91,.18)}
.climb-app .rung.here .lvl{color:#fff}
.climb-app .rung.here .node{background:var(--gold);border-color:var(--gold-lite);box-shadow:0 0 12px rgba(201,163,91,.7)}
.climb-app .rung.here .tag{background:var(--gold);color:#241b02}
.climb-app .rung.done{opacity:.6}
.climb-app .rung.done .node{background:var(--spark);border-color:var(--spark)}
.climb-app .rung.done .tag{background:rgba(55,224,137,.12);color:var(--spark)}
.climb-app .ladder .connector{height:10px;width:2px;background:var(--line);margin:0 0 0 23px}

.climb-app .gap{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px 17px;margin-bottom:10px}
.climb-app .gap .gh{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;gap:10px}
.climb-app .gap .gn{font-weight:600;font-size:13.5px;color:#fff}
.climb-app .gap .gp{font-family:var(--mono);font-size:12px;color:var(--gold-lite);white-space:nowrap}
.climb-app .gap .track{height:7px;border-radius:99px;background:#0c121b;overflow:hidden;border:1px solid var(--line)}
.climb-app .gap .track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold-deep),var(--gold-lite))}
.climb-app .gap .gd{font-size:11.5px;color:var(--hint);margin-top:8px;line-height:1.5}

.climb-app .form{display:flex;gap:8px;padding:0 6px}
.climb-app .fg{flex:1;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 8px;text-align:center;min-width:0}
.climb-app .fg .fr{font-weight:800;font-size:18px;color:#fff}
.climb-app .fg .fr.hot{color:var(--spark)}
.climb-app .fg .fo{font-size:10px;color:var(--hint);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.climb-app .belief{background:linear-gradient(135deg,#1d273a,#141b27);border:1px solid var(--line);border-radius:20px;padding:20px;position:relative;overflow:hidden;margin-top:14px}
.climb-app .belief::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--gold-lite),var(--gold-deep))}
.climb-app .belief .bh{display:flex;align-items:center;gap:11px;margin-bottom:13px}
.climb-app .belief .av{width:40px;height:40px;border-radius:50%;background:var(--ink);border:1px solid var(--gold-deep);color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:600;font-size:15px}
.climb-app .belief .who .n{font-weight:700;font-size:13.5px;color:#fff}
.climb-app .belief .who .r{font-size:11px;color:var(--hint)}
.climb-app .belief .quote{font-family:var(--display);font-style:italic;font-size:16px;line-height:1.45;color:#EAEFF5}
.climb-app .belief .quote .hl{color:var(--gold-lite);font-style:normal;font-weight:500}

.climb-app .tabbar{display:flex;justify-content:space-around;padding:14px 10px 18px;margin-top:18px;border-top:1px solid var(--line);background:var(--ink-2)}
.climb-app .tb{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--hint);font-size:10px;font-weight:500}
.climb-app .tb svg{width:21px;height:21px;stroke-width:1.8}
.climb-app .tb.on{color:var(--gold)}

@media (min-width:880px){
  .climb-app{padding:30px}
  .climb-app .app{max-width:1140px;border-radius:24px}
  .climb-app .bar{padding:24px 30px 16px}
  .climb-app .content{padding:0 22px 8px;display:grid;grid-template-columns:1.5fr 1fr;grid-template-areas:"hero hero" "main side";gap:22px;align-items:start}
  .climb-app .hero{grid-area:hero;padding:34px 38px}
  .climb-app .hero .face{width:84px;height:84px;font-size:30px;top:32px;right:38px}
  .climb-app .hero h1{font-size:56px;letter-spacing:-2.2px}
  .climb-app .hero .gapbanner{max-width:430px}
  .climb-app .zone-main{grid-area:main;min-width:0}
  .climb-app .zone-side{grid-area:side}
  .climb-app .zone-main .sh:first-child,.climb-app .zone-side .sh:first-child{padding-top:0}
  .climb-app .belief{margin-top:0}
  .climb-app .tabbar{display:none}
}
`;

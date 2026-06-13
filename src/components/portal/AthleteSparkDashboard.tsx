import React from "react";
import { Play, Plus, Home as HomeIcon, Film, Target, User as UserIcon } from "lucide-react";
import type { Athlete } from "@/hooks/usePortalData";
import { useMonthlyReviews } from "@/hooks/usePortalData";

/**
 * Athlete "Spark" dashboard (15-17 cohort).
 * Mockup-faithful, scoped via .spark-app class to avoid leaking styles.
 */
export default function AthleteSparkDashboard({ athlete }: { athlete: Athlete }) {
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

  const wellbeing = athlete.wellbeingScore || 0;
  const focus = review?.focus && review.focus !== "—" ? review.focus : "Keep building. Every session counts.";

  // Stub highlights — to be wired to a clips table later.
  const clips: { title: string; meta: string; tone: "c1" | "c2" | "c3" }[] = [
    { title: "Line break + try assist", meta: "vs Norths · :22", tone: "c1" },
    { title: "Try-saving cover tackle", meta: "vs Souths · :18", tone: "c2" },
    { title: "Ball-playing 40/20", meta: "SG Ball · :09", tone: "c3" },
  ];

  return (
    <>
      <style>{sparkCss}</style>
      <div className="spark-app">
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
                ON THE RADAR
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

              <div className="weekrow">
                <div className="wk">
                  <div className="n">5</div>
                  <div className="l">Sessions this week</div>
                </div>
                <div className="wk">
                  <div className="n">13<small>▲</small></div>
                  <div className="l">Tackle busts</div>
                </div>
                <div className="wk">
                  <div className="n">{wellbeing >= 4 ? "12d" : "—"}</div>
                  <div className="l">Feeling good streak</div>
                </div>
              </div>
            </div>

            <div className="zone-main">
              {/* Highlights */}
              <div className="sh">
                <div className="t">
                  <span className="bar3"><i /><i /><i /></span>
                  Your highlights
                </div>
                <a className="more" href="#">See all</a>
              </div>
              <div className="reel">
                {clips.map((c, i) => (
                  <div key={i} className={`clip ${c.tone}`}>
                    <div className="play"><Play size={13} fill="currentColor" /></div>
                    <div className="cap">
                      <div className="ct">{c.title}</div>
                      <div className="cd">{c.meta}</div>
                    </div>
                  </div>
                ))}
                <div className="clip add">
                  <Plus size={24} />
                  <span>Add a clip</span>
                </div>
              </div>

              {/* Momentum */}
              <div className="sh">
                <div className="t">
                  <span className="bar3"><i /><i /><i /></span>
                  Your momentum
                </div>
              </div>
              <div className="rings">
                <div className="ring">
                  <div className="rn">5<span>/6</span></div>
                  <div className="rl"><b>Training</b><br />this week</div>
                </div>
                <div className="ring">
                  <div className="rn">{wellbeing}<span>/5</span></div>
                  <div className="rl"><b>Wellbeing</b><br />feeling good</div>
                </div>
                <div className="ring">
                  <div className="rn">+44%</div>
                  <div className="rl"><b>Tackle busts</b><br />vs last block</div>
                </div>
              </div>
            </div>

            <div className="zone-side">
              {/* Belief / agent quote */}
              <div className="sh">
                <div className="t">
                  <span className="bar3"><i /><i /><i /></span>
                  From your agent
                </div>
              </div>
              <div className="belief">
                <div className="bh">
                  <div className="av">{agentInitials || "—"}</div>
                  <div className="who">
                    <div className="n">{athlete.assignedAgent}</div>
                    <div className="r">Your agent</div>
                  </div>
                </div>
                <div className="quote">
                  "{firstName} — <span className="hl">{focus}</span> Proud of how you're training, mate."
                </div>
              </div>

              {/* Milestone */}
              <div className="milestone">
                <div className="ml">Next milestone</div>
                <div className="mt">{athlete.stage === "Pre-Pro" ? "First-grade debut" : "NSW SG Ball squad"}</div>
                <div className="ms">You're tracking. Keep the form and the work-rate up.</div>
                <div className="track"><i style={{ width: "74%" }} /></div>
                <div className="mfoot">
                  <span>On track</span>
                  <span>74%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbar */}
          <div className="tabbar">
            <div className="tb on"><HomeIcon /><span>Home</span></div>
            <div className="tb"><Film /><span>Highlights</span></div>
            <div className="tb"><Target /><span>Goals</span></div>
            <div className="tb"><UserIcon /><span>Me</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

const sparkCss = `
.spark-app{
  --ink:#080C13; --ink-2:#0E141F; --card:#131B27; --line:#243245;
  --gold:#C9A35B; --gold-lite:#E9CE91; --gold-deep:#9A7B36;
  --spark:#37E089; --spark-deep:#14A35E;
  --soft:#AAB6C6; --hint:#6B7889;
  --display:'Fraunces',serif; --body:'Geist',system-ui,sans-serif; --mono:'Geist Mono',monospace;
  font-family:var(--body);
  background:#05080D;
  min-height:100vh;
  display:flex;justify-content:center;
  padding:20px 14px 50px;
  -webkit-font-smoothing:antialiased;
}
.spark-app .app{width:100%;max-width:440px;background:var(--ink);border-radius:28px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55);position:relative}
.spark-app .bar{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 12px}
.spark-app .bar .crest{display:flex;align-items:center;gap:9px}
.spark-app .bar .crest .w{font-family:var(--display);font-weight:500;font-size:17px;color:#fff}
.spark-app .bar .ico{width:36px;height:36px;border-radius:50%;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--soft)}
.spark-app .content{padding:0 14px}

.spark-app .hero{position:relative;border-radius:24px;overflow:hidden;
  background:radial-gradient(130% 100% at 80% 0%, #233247 0%, #131C29 46%, #0C121B 100%);
  border:1px solid var(--line);padding:22px}
.spark-app .hero::before{content:"";position:absolute;right:-50px;top:-50px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(201,163,91,.28),transparent 62%)}
.spark-app .hero .status{position:relative;display:inline-flex;align-items:center;gap:7px;background:rgba(55,224,137,.12);border:1px solid rgba(55,224,137,.3);color:var(--spark);font-size:11px;font-weight:600;letter-spacing:.4px;padding:5px 11px;border-radius:99px;margin-bottom:56px}
.spark-app .hero .status .live{width:7px;height:7px;border-radius:50%;background:var(--spark);animation:sparkPulse 2s infinite}
@keyframes sparkPulse{0%{box-shadow:0 0 0 0 rgba(55,224,137,.5)}70%{box-shadow:0 0 0 9px rgba(55,224,137,0)}100%{box-shadow:0 0 0 0 rgba(55,224,137,0)}}

.spark-app .hero .pos{position:relative;font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--gold-lite);text-transform:uppercase;margin-bottom:5px}
.spark-app .hero h1{position:relative;font-weight:800;font-size:40px;line-height:.96;color:#fff;margin-bottom:11px}
.spark-app .hero .club{position:relative;font-size:13.5px;color:var(--soft);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.spark-app .hero .club .dot{width:3px;height:3px;border-radius:50%;background:var(--hint)}

.spark-app .hero .face{position:absolute;top:20px;right:20px;width:66px;height:66px;border-radius:18px;
  background:linear-gradient(150deg,var(--gold-lite),var(--gold-deep));display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:24px;color:#1c1404;border:2px solid rgba(255,255,255,.15);box-shadow:0 8px 20px rgba(0,0,0,.4);overflow:hidden}
.spark-app .hero .face img{width:100%;height:100%;object-fit:cover}

.spark-app .weekrow{position:relative;display:flex;gap:9px;margin-top:18px}
.spark-app .wk{flex:1;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:13px;padding:11px 12px}
.spark-app .wk .n{font-weight:800;font-size:19px;color:#fff;display:flex;align-items:baseline;gap:3px}
.spark-app .wk .n small{font-size:11px;color:var(--spark);font-weight:600}
.spark-app .wk .l{font-size:10px;color:var(--hint);margin-top:2px}

.spark-app .sh{display:flex;align-items:center;justify-content:space-between;padding:22px 6px 12px}
.spark-app .sh .t{font-weight:700;font-size:15px;color:#fff;display:flex;align-items:center;gap:9px}
.spark-app .sh .t .bar3{display:flex;gap:2px;align-items:flex-end;height:15px}
.spark-app .sh .t .bar3 i{width:3px;border-radius:1px;background:var(--gold)}
.spark-app .sh .t .bar3 i:nth-child(1){height:6px}
.spark-app .sh .t .bar3 i:nth-child(2){height:15px}
.spark-app .sh .t .bar3 i:nth-child(3){height:10px}
.spark-app .sh .more{font-size:12px;color:var(--gold-lite);font-weight:500;text-decoration:none}

.spark-app .reel{display:flex;gap:11px;overflow-x:auto;padding:0 6px 4px;scrollbar-width:none}
.spark-app .reel::-webkit-scrollbar{display:none}
.spark-app .reel::after{content:"";flex:0 0 2px}
.spark-app .clip{flex:0 0 152px;height:204px;border-radius:16px;position:relative;overflow:hidden;border:1px solid var(--line);
  background:linear-gradient(165deg,#1c2738,#0e1018)}
.spark-app .clip.c2{background:linear-gradient(165deg,#26203a,#0e1018)}
.spark-app .clip.c3{background:linear-gradient(165deg,#10293a,#0e1018)}
.spark-app .clip .play{position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.14);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;color:#fff}
.spark-app .clip .cap{position:absolute;left:0;right:0;bottom:0;padding:30px 13px 13px;background:linear-gradient(transparent,rgba(0,0,0,.85))}
.spark-app .clip .cap .ct{font-weight:700;font-size:12.5px;color:#fff;line-height:1.2}
.spark-app .clip .cap .cd{font-size:10.5px;color:var(--soft);margin-top:3px;font-family:var(--mono)}
.spark-app .clip.add{background:var(--card);border:1.5px dashed var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--soft);cursor:pointer}
.spark-app .clip.add svg{color:var(--gold)}
.spark-app .clip.add span{font-size:12px;font-weight:500}

.spark-app .rings{display:flex;gap:11px;padding:0 6px}
.spark-app .ring{flex:1;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 10px;text-align:center;display:flex;flex-direction:column;align-items:center;min-width:0}
.spark-app .ring .rn{font-weight:800;font-size:18px;color:#fff;letter-spacing:-.4px;line-height:1}
.spark-app .ring .rn span{font-size:12px;color:var(--hint)}
.spark-app .ring .rl{font-size:10.5px;color:var(--soft);line-height:1.25;margin-top:5px}
.spark-app .ring .rl b{color:#fff;font-weight:600}

.spark-app .belief{background:linear-gradient(135deg,#1d273a,#141b27);border:1px solid var(--line);border-radius:20px;padding:20px;position:relative;overflow:hidden}
.spark-app .belief::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--gold-lite),var(--gold-deep))}
.spark-app .belief .bh{display:flex;align-items:center;gap:11px;margin-bottom:13px}
.spark-app .belief .av{width:40px;height:40px;border-radius:50%;background:var(--ink);border:1px solid var(--gold-deep);color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:600;font-size:15px}
.spark-app .belief .who .n{font-weight:700;font-size:13.5px;color:#fff}
.spark-app .belief .who .r{font-size:11px;color:var(--hint)}
.spark-app .belief .quote{font-family:var(--display);font-style:italic;font-size:16.5px;line-height:1.45;color:#EAEFF5}
.spark-app .belief .quote .hl{color:var(--gold-lite);font-style:normal;font-weight:500}

.spark-app .milestone{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px;margin-top:14px}
.spark-app .milestone .ml{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--hint);font-weight:600;margin-bottom:10px}
.spark-app .milestone .mt{font-weight:700;font-size:17px;color:#fff;margin-bottom:3px}
.spark-app .milestone .ms{font-size:12.5px;color:var(--soft);margin-bottom:14px}
.spark-app .milestone .track{height:9px;border-radius:99px;background:#0c121b;overflow:hidden;border:1px solid var(--line)}
.spark-app .milestone .track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold-deep),var(--gold-lite));box-shadow:0 0 12px rgba(201,163,91,.5)}
.spark-app .milestone .mfoot{display:flex;justify-content:space-between;margin-top:9px;font-size:11px;color:var(--hint);font-family:var(--mono)}

.spark-app .tabbar{display:flex;justify-content:space-around;padding:14px 10px 18px;margin-top:18px;border-top:1px solid var(--line);background:var(--ink-2)}
.spark-app .tb{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--hint);font-size:10px;font-weight:500}
.spark-app .tb svg{width:21px;height:21px;stroke-width:1.8}
.spark-app .tb.on{color:var(--gold)}

@media (min-width:880px){
  .spark-app{padding:30px}
  .spark-app .app{max-width:1140px;border-radius:24px}
  .spark-app .bar{padding:24px 30px 16px}
  .spark-app .content{padding:0 22px 8px;display:grid;grid-template-columns:1.55fr 1fr;grid-template-areas:"hero hero" "main side";gap:22px;align-items:start}
  .spark-app .hero{grid-area:hero;padding:34px 38px}
  .spark-app .hero .face{width:88px;height:88px;font-size:30px;top:32px;right:38px}
  .spark-app .hero .status{margin-bottom:22px}
  .spark-app .hero h1{font-size:60px}
  .spark-app .hero .weekrow{max-width:580px;margin-top:22px}
  .spark-app .zone-main{grid-area:main;min-width:0}
  .spark-app .zone-side{grid-area:side}
  .spark-app .zone-main .sh,.spark-app .zone-side .sh{padding-top:0}
  .spark-app .zone-main .sh:nth-of-type(2){padding-top:22px}
  .spark-app .reel{display:grid;grid-template-columns:repeat(3,1fr);overflow:visible}
  .spark-app .reel::after{display:none}
  .spark-app .clip{flex:none;width:100%;height:220px}
  .spark-app .clip.add{display:none}
  .spark-app .belief{margin-top:0}
  .spark-app .tabbar{display:none}
}
`;

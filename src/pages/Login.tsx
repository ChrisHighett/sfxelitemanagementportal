import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArcLoader } from "@/components/brand/Brand";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/portal");
    }
  };

  return (
    <div className="eleva-login">
      <div className="split">
        {/* LEFT — brand stage */}
        <aside className="stage" aria-hidden="false">
          <div className="glow" />
          <div className="top">
            <div className="word">
              Eleva
              <small>EST. 1996</small>
            </div>
          </div>

          <div className="center">
            <div className="bars" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
            <h2 className="headline">
              To represent talent is one thing.<br />
              To <span className="g">raise</span> it is another.
            </h2>
            <p className="sub">
              The operating system for the people who represent talent. Built in sport. Designed to elevate.
            </p>
          </div>

          <div className="foot">
            <span>The agent's craft, systematised</span>
            <span className="dot" />
            <span>Private &amp; secure</span>
            <span className="dot" />
            <span>est. 1996</span>
          </div>
        </aside>

        {/* RIGHT — sign-in panel */}
        <section className="panel">
          <div className="eyebrow">Welcome back</div>
          <h1>Sign in to Eleva</h1>
          <p className="p">Enter your details to reach your portal.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="field"
              type="email"
              required
              placeholder="name@youragency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="field"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button type="submit" className="signbtn" disabled={loading}>
              {loading ? <ArcLoader size={16} /> : <>Sign in <span className="arw">→</span></>}
            </button>

            <div className="minor">
              <label className="keep">
                <input type="checkbox" defaultChecked /> Keep me signed in
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          </form>

          <p className="legal">
            First time here? Use the invite link from your agent or admin to set your password.
            By signing in you agree to Eleva's terms and privacy policy.
          </p>
        </section>
      </div>

      <style>{`
        .eleva-login{
          --ink:#0B1019; --ink-2:#101820; --line:#27313F;
          --gold:#C9A35B; --gold-lite:#E3C78A; --gold-deep:#9A7B36;
          --muted:#8A93A0; --hint:#5C6675;
          --display:'Fraunces',serif; --body:'Geist',system-ui,sans-serif;
          font-family:var(--body);
          background:var(--ink); color:#fff;
          min-height:100vh; width:100%; overflow:hidden;
          -webkit-font-smoothing:antialiased;
        }
        .eleva-login *{box-sizing:border-box}
        .eleva-login .split{display:flex;width:100%;min-height:100vh}

        .eleva-login .stage{
          flex:1.15; position:relative;
          background: radial-gradient(120% 90% at 18% 12%, #16202E 0%, var(--ink-2) 42%, var(--ink) 100%);
          overflow:hidden; display:flex; flex-direction:column;
          justify-content:space-between; padding:54px 60px;
        }
        .eleva-login .stage::before{
          content:""; position:absolute; inset:0; pointer-events:none;
          background:
            linear-gradient(to right, transparent 0 49.6%, rgba(201,163,91,.05) 49.8% 50.2%, transparent 50.4%),
            radial-gradient(60% 40% at 50% 118%, rgba(201,163,91,.10), transparent 70%);
        }
        .eleva-login .glow{
          position:absolute; width:520px; height:520px; border-radius:50%;
          background:radial-gradient(circle, rgba(201,163,91,.16), transparent 62%);
          top:-120px; right:-120px; filter:blur(6px);
          animation:elv-drift 14s ease-in-out infinite alternate;
        }
        @keyframes elv-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(-40px,40px) scale(1.12)}}

        .eleva-login .top{position:relative;z-index:2;display:flex;align-items:center;gap:13px}
        .eleva-login .top .word{font-family:var(--display);font-weight:500;font-size:26px;letter-spacing:-.4px}
        .eleva-login .top .word small{display:block;font-family:var(--body);font-weight:500;font-size:9px;letter-spacing:3.5px;color:var(--gold);margin-top:3px}

        .eleva-login .center{position:relative;z-index:2}
        .eleva-login .bars{display:flex;align-items:flex-end;gap:10px;height:120px;margin-bottom:30px}
        .eleva-login .bars span{width:22px;border-radius:5px;background:linear-gradient(to top,var(--gold-deep),var(--gold-lite));transform-origin:bottom;animation:elv-rise 1.1s cubic-bezier(.2,.8,.2,1) both}
        .eleva-login .bars span:nth-child(1){height:26px;animation-delay:.05s}
        .eleva-login .bars span:nth-child(2){height:104px;animation-delay:.18s}
        .eleva-login .bars span:nth-child(3){height:104px;animation-delay:.31s}
        .eleva-login .bars span:nth-child(4){height:64px;animation-delay:.44s}
        @keyframes elv-rise{from{transform:scaleY(0);opacity:0}to{transform:scaleY(1);opacity:1}}

        .eleva-login .headline{font-family:var(--display);font-weight:500;font-size:52px;line-height:1.04;letter-spacing:-1.2px;max-width:13ch;color:#fff}
        .eleva-login .headline .g{color:var(--gold);font-style:italic;font-weight:400}
        .eleva-login .sub{margin-top:22px;font-size:16px;color:var(--muted);max-width:40ch;line-height:1.6}

        .eleva-login .foot{position:relative;z-index:2;display:flex;align-items:center;gap:14px;font-size:12px;color:var(--hint);flex-wrap:wrap}
        .eleva-login .foot span:not(.dot){white-space:nowrap}
        .eleva-login .foot .dot{width:4px;height:4px;border-radius:50%;background:var(--gold);opacity:.6}

        .eleva-login .panel{width:480px;background:#fff;color:var(--ink);display:flex;flex-direction:column;justify-content:center;padding:64px 56px}
        .eleva-login .panel .eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold-deep);font-weight:600}
        .eleva-login .panel h1{font-family:var(--display);font-weight:500;font-size:30px;letter-spacing:-.4px;margin:12px 0 6px;color:var(--ink)}
        .eleva-login .panel .p{font-size:14px;color:#5C636C;margin-bottom:30px}
        .eleva-login label{display:block;font-size:12.5px;font-weight:500;color:#3A4150;margin:0 0 7px}
        .eleva-login .field{width:100%;border:1px solid #E2E6EC;border-radius:11px;padding:13px 15px;font-family:var(--body);font-size:14px;color:var(--ink);background:#FBFCFD;margin-bottom:18px;transition:.15s}
        .eleva-login .field:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,163,91,.15);background:#fff}
        .eleva-login .signbtn{width:100%;background:var(--ink-2);color:#fff;border:none;border-radius:11px;padding:14px;font-family:var(--body);font-size:15px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:.15s}
        .eleva-login .signbtn:hover{background:#16202E}
        .eleva-login .signbtn:disabled{opacity:.7;cursor:not-allowed}
        .eleva-login .signbtn .arw{transition:.2s;display:inline-block}
        .eleva-login .signbtn:hover .arw{transform:translateX(3px)}
        .eleva-login .minor{display:flex;justify-content:space-between;align-items:center;margin-top:18px;font-size:13px;color:#3A4150}
        .eleva-login .minor .keep{display:flex;align-items:center;gap:8px;margin:0;font-weight:400;font-size:13px;color:#3A4150;cursor:pointer}
        .eleva-login .minor a{color:var(--gold-deep);text-decoration:none;font-weight:500}
        .eleva-login .minor a:hover{text-decoration:underline}
        .eleva-login .panel .legal{margin-top:auto;padding-top:34px;font-size:11px;color:#9AA0A8;line-height:1.5}

        @media (max-width:880px){
          .eleva-login .stage{display:none}
          .eleva-login .panel{width:100%;padding:48px 28px}
        }
      `}</style>
    </div>
  );
};

export default Login;

"use client";
import { useSession, signIn } from "next-auth/react";
import { PLANS, FEATURES, TRIAL_DAYS } from "@/lib/plans";
import { useGoogleConfigured } from "@/lib/useGoogleConfigured";

const T = {
  bg:"#06070F",s1:"#0D0F1E",s2:"#131628",border:"rgba(255,255,255,0.08)",
  primary:"#5B5FED",teal:"#00C896",orange:"#FF6B35",amber:"#F5A623",
  rose:"#F43F5E",purple:"#A855F7",cyan:"#06B6D4",
  text:"#E2E5F1",muted:"#8B95B8",dim:"#252A45",
};

const AGENTS = [
  {icon:"🔍",name:"Product Scout",desc:"Finds winning products with AI market research in seconds, not days."},
  {icon:"🏭",name:"Supplier Connect",desc:"Sources Chinese suppliers with US warehouse stock automatically."},
  {icon:"🎨",name:"Creative Studio",desc:"Writes ad scripts, product copy and captions instantly with Claude."},
  {icon:"📢",name:"Ad Launch",desc:"Builds and deploys Meta + TikTok campaigns from one prompt."},
  {icon:"🛍️",name:"Store Manager",desc:"Lists and manages your Shopify catalog for you."},
  {icon:"📦",name:"Fulfillment",desc:"Routes orders through ShipBob and tracks last-mile delivery."},
  {icon:"📊",name:"Analytics",desc:"Live ROAS and CAC dashboards pulled straight from your ad accounts."},
  {icon:"💰",name:"Finance",desc:"Tracks P&L, margins and budget pacing automatically."},
];

const FAQ = [
  {q:`What happens after the ${TRIAL_DAYS}-day trial?`,a:"You keep full access for 3 days, no card required. After that you'll be asked to pick a plan to keep using the dashboard — your data is never deleted."},
  {q:"Can I cancel anytime?",a:"Yes. Manage or cancel your subscription anytime from the billing portal — no phone calls, no retention forms."},
  {q:"Do I need my own API keys?",a:"Yes — FLUXE connects to Claude, Shopify, Meta, TikTok, CJ Dropshipping and ShipBob using your own accounts. See the setup guide for exact steps."},
  {q:"Is my data safe?",a:"Your credentials stay in your own environment variables and are never shared across accounts."},
];

function Section({id,children,style}){
  return <section id={id} style={{maxWidth:1100,margin:"0 auto",padding:"70px 24px",...style}}>{children}</section>;
}

export default function Landing(){
  const {data:session}=useSession();
  const googleConfigured=useGoogleConfigured();
  const start = () => {
    if(session?.user){window.location.href="/app";return;}
    if(googleConfigured===false){window.location.href="/signup";return;}
    signIn("google",{callbackUrl:"/app"});
  };

  return <div style={{background:T.bg,color:T.text,fontFamily:"'Inter',-apple-system,sans-serif",minHeight:"100vh",overflowX:"hidden"}}>
    <style>{`@media (max-width:640px){.landing-nav-links{display:none !important}}`}</style>
    {/* NAV */}
    <div style={{position:"sticky",top:0,zIndex:50,background:`${T.bg}ee`,backdropFilter:"blur(8px)",borderBottom:`1px solid ${T.border}`}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${T.primary},${T.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>⚡</div>
          <span style={{fontWeight:800,fontSize:16,letterSpacing:-.5}}>FLUXE</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <div className="landing-nav-links" style={{display:"flex",alignItems:"center",gap:24}}>
            <a href="#features" style={{color:T.muted,fontSize:13,textDecoration:"none"}}>Features</a>
            <a href="#pricing" style={{color:T.muted,fontSize:13,textDecoration:"none"}}>Pricing</a>
            <a href="/guide" style={{color:T.muted,fontSize:13,textDecoration:"none"}}>Setup Guide</a>
          </div>
          <button onClick={start} style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:"#fff",fontWeight:700,fontSize:13,borderRadius:9,padding:"8px 16px",cursor:"pointer",whiteSpace:"nowrap"}}>
            {session?.user?"Go to Dashboard":"Sign in"}
          </button>
        </div>
      </div>
    </div>

    {/* HERO */}
    <Section style={{textAlign:"center",paddingTop:90,paddingBottom:60}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:6,background:`${T.teal}12`,border:`1px solid ${T.teal}30`,borderRadius:20,padding:"5px 14px",marginBottom:22}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:T.teal}}/>
        <span style={{color:T.teal,fontSize:12,fontWeight:700}}>Free {TRIAL_DAYS}-day trial · no card required</span>
      </div>
      <h1 style={{fontSize:"clamp(30px,6vw,48px)",fontWeight:800,letterSpacing:-1.5,lineHeight:1.15,margin:"0 0 18px"}}>
        8 AI agents run your<br/><span style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>entire e-commerce store</span>
      </h1>
      <p style={{color:T.muted,fontSize:16,maxWidth:620,margin:"0 auto 32px",lineHeight:1.6,padding:"0 8px"}}>
        FLUXE finds winning products, sources suppliers, writes your ads, launches Meta + TikTok campaigns, lists on Shopify, and tracks fulfillment and P&L — so you do in minutes what used to take a full team days.
      </p>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={start} style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:"#fff",fontWeight:700,fontSize:14,borderRadius:10,padding:"13px 26px",cursor:"pointer",boxShadow:`0 8px 30px ${T.primary}55`}}>
          Start free {TRIAL_DAYS}-day trial →
        </button>
        <a href="#features" style={{background:"transparent",border:`1px solid ${T.dim}`,color:T.text,fontWeight:700,fontSize:14,borderRadius:10,padding:"13px 26px",textDecoration:"none"}}>
          See how it works
        </a>
      </div>
    </Section>

    {/* FEATURES */}
    <Section id="features">
      <div style={{textAlign:"center",marginBottom:40}}>
        <h2 style={{fontSize:30,fontWeight:800,letterSpacing:-.5,marginBottom:10}}>One dashboard. Eight specialists.</h2>
        <p style={{color:T.muted,fontSize:15}}>Every stage of running a store, handled by a dedicated AI agent.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
        {AGENTS.map(a=><div key={a.name} style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:14,padding:"20px 22px"}}>
          <div style={{fontSize:26,marginBottom:10}}>{a.icon}</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{a.name}</div>
          <div style={{color:T.muted,fontSize:13,lineHeight:1.5}}>{a.desc}</div>
        </div>)}
      </div>
    </Section>

    {/* PRICING */}
    <Section id="pricing">
      <div style={{textAlign:"center",marginBottom:40}}>
        <h2 style={{fontSize:30,fontWeight:800,letterSpacing:-.5,marginBottom:10}}>Simple pricing</h2>
        <p style={{color:T.muted,fontSize:15}}>Every plan includes all 8 agents. Try free for {TRIAL_DAYS} days, cancel anytime.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,maxWidth:700,margin:"0 auto"}}>
        {Object.values(PLANS).map(p=>{
          const yearly=p.id==="yearly";
          return <div key={p.id} style={{background:T.s1,border:`1px solid ${yearly?T.teal:T.border}`,borderRadius:18,padding:"28px 26px",position:"relative"}}>
            {yearly&&<div style={{position:"absolute",top:-12,right:20,background:T.teal,color:"#06070F",fontSize:11,fontWeight:800,borderRadius:20,padding:"3px 12px"}}>Save 58%</div>}
            <div style={{color:T.muted,fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{p.label}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:18}}>
              <span style={{fontSize:40,fontWeight:800}}>${p.price}</span>
              <span style={{color:T.muted,fontSize:14}}>/{p.period}</span>
            </div>
            <ul style={{listStyle:"none",padding:0,margin:"0 0 22px",display:"flex",flexDirection:"column",gap:10}}>
              {FEATURES.map(f=><li key={f} style={{display:"flex",gap:8,color:T.muted,fontSize:13,lineHeight:1.4}}>
                <span style={{color:T.teal}}>✓</span>{f}
              </li>)}
            </ul>
            <button onClick={start} style={{width:"100%",background:yearly?`linear-gradient(135deg,${T.teal},${T.cyan})`:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:yearly?"#06070F":"#fff",fontWeight:700,fontSize:14,borderRadius:9,padding:"12px",cursor:"pointer"}}>
              Start free trial
            </button>
          </div>;
        })}
      </div>
    </Section>

    {/* FAQ */}
    <Section>
      <div style={{textAlign:"center",marginBottom:34}}>
        <h2 style={{fontSize:30,fontWeight:800,letterSpacing:-.5}}>Questions</h2>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:680,margin:"0 auto"}}>
        {FAQ.map(f=><div key={f.q} style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{f.q}</div>
          <div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{f.a}</div>
        </div>)}
      </div>
    </Section>

    {/* FOOTER */}
    <div style={{borderTop:`1px solid ${T.border}`,padding:"28px 24px",textAlign:"center"}}>
      <div style={{color:T.dim,fontSize:12}}>© {new Date().getFullYear()} FLUXE. Built for e-commerce operators who'd rather ship than click.</div>
      <div style={{marginTop:10,display:"flex",gap:16,justifyContent:"center"}}>
        <a href="/guide" style={{color:T.muted,fontSize:12,textDecoration:"none"}}>Setup Guide</a>
        <a href="/signin" style={{color:T.muted,fontSize:12,textDecoration:"none"}}>Sign in</a>
      </div>
    </div>
  </div>;
}

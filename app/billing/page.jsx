"use client";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { PLANS, FEATURES } from "@/lib/plans";
import { useGoogleConfigured } from "@/lib/useGoogleConfigured";

const T = {
  bg:"#06070F",s1:"#0D0F1E",border:"rgba(255,255,255,0.08)",
  primary:"#5B5FED",cyan:"#06B6D4",teal:"#00C896",rose:"#F43F5E",amber:"#F5A623",
  text:"#E2E5F1",muted:"#8B95B8",dim:"#252A45",
};

export default function BillingPage(){
  const {data:session,status}=useSession();
  const googleConfigured=useGoogleConfigured();
  const [loading,setLoading]=useState("");
  const [error,setError]=useState("");

  const subscribe=async(plan)=>{
    setError("");setLoading(plan);
    try{
      const res=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});
      const d=await res.json();
      if(d.error)throw new Error(d.error);
      window.location.href=d.url;
    }catch(e){setError(e.message);}
    setLoading("");
  };

  if(status==="loading")return null;
  if(!session?.user)return <div style={{background:T.bg,color:T.text,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',-apple-system,sans-serif",padding:24}}>
    <div style={{textAlign:"center"}}>
      <p style={{color:T.muted,marginBottom:16}}>Sign in to manage billing.</p>
      {googleConfigured===false
        ?<a href="/signin?callbackUrl=/billing" style={{color:"#fff",background:`linear-gradient(135deg,${T.primary},${T.cyan})`,fontWeight:700,borderRadius:9,padding:"10px 20px",textDecoration:"none",display:"inline-block"}}>Sign in with email</a>
        :<button onClick={()=>signIn("google",{callbackUrl:"/billing"})} style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:"#fff",fontWeight:700,borderRadius:9,padding:"10px 20px",cursor:"pointer"}}>Sign in</button>}
    </div>
  </div>;

  const trialEnded = !session.user.trialEndsAt || new Date(session.user.trialEndsAt).getTime() <= Date.now();
  const isActive = session.user.billingStatus === "active";

  return <div style={{background:T.bg,color:T.text,minHeight:"100vh",fontFamily:"'Inter',-apple-system,sans-serif",padding:"60px 24px"}}>
    <div style={{maxWidth:760,margin:"0 auto",textAlign:"center"}}>
      <div style={{width:44,height:44,borderRadius:12,margin:"0 auto 18px",background:`linear-gradient(135deg,${T.primary},${T.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
      {isActive?<>
        <h1 style={{fontSize:24,fontWeight:800,marginBottom:8}}>You're subscribed 🎉</h1>
        <p style={{color:T.muted,marginBottom:24}}>Your {session.user.plan} plan is active.</p>
        <a href="/app" style={{color:T.teal,fontWeight:700,fontSize:14,textDecoration:"none"}}>Go to your dashboard →</a>
      </>:<>
        <h1 style={{fontSize:26,fontWeight:800,marginBottom:8}}>{trialEnded?"Your free trial has ended":"Pick a plan"}</h1>
        <p style={{color:T.muted,marginBottom:36}}>{trialEnded?"Subscribe to keep using all 8 FLUXE agents.":"Subscribe now or keep exploring on your free trial."}</p>
      </>}
      {error&&<div style={{background:"rgba(244,63,94,.1)",border:`1px solid ${T.rose}30`,borderRadius:8,padding:"10px 14px",marginBottom:20,color:T.rose,fontSize:12}}>⚠️ {error}</div>}
      {!isActive&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,textAlign:"left"}}>
        {Object.values(PLANS).map(p=>{
          const yearly=p.id==="yearly";
          return <div key={p.id} style={{background:T.s1,border:`1px solid ${yearly?T.teal:T.border}`,borderRadius:18,padding:"26px 24px",position:"relative"}}>
            {yearly&&<div style={{position:"absolute",top:-12,right:20,background:T.teal,color:"#06070F",fontSize:11,fontWeight:800,borderRadius:20,padding:"3px 12px"}}>Save 58%</div>}
            <div style={{color:T.muted,fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{p.label}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:16}}><span style={{fontSize:36,fontWeight:800}}>${p.price}</span><span style={{color:T.muted,fontSize:13}}>/{p.period}</span></div>
            <ul style={{listStyle:"none",padding:0,margin:"0 0 20px",display:"flex",flexDirection:"column",gap:8}}>
              {FEATURES.slice(0,5).map(f=><li key={f} style={{display:"flex",gap:8,color:T.muted,fontSize:12,lineHeight:1.4}}><span style={{color:T.teal}}>✓</span>{f}</li>)}
            </ul>
            <button onClick={()=>subscribe(p.id)} disabled={loading===p.id} style={{width:"100%",background:yearly?`linear-gradient(135deg,${T.teal},${T.cyan})`:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:yearly?"#06070F":"#fff",fontWeight:700,fontSize:14,borderRadius:9,padding:"12px",cursor:loading===p.id?"not-allowed":"pointer",opacity:loading===p.id?.6:1}}>
              {loading===p.id?"Redirecting…":`Subscribe ${p.label}`}
            </button>
          </div>;
        })}
      </div>}
      {!isActive&&!trialEnded&&<div style={{marginTop:28}}><a href="/app" style={{color:T.dim,fontSize:12,textDecoration:"none"}}>← Keep using my free trial</a></div>}
    </div>
  </div>;
}

"use client";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TRIAL_DAYS } from "@/lib/plans";
import { useGoogleConfigured } from "@/lib/useGoogleConfigured";

const T = {
  bg:"#06070F",s1:"#0D0F1E",s2:"#131628",border:"rgba(255,255,255,0.08)",
  primary:"#5B5FED",cyan:"#06B6D4",teal:"#00C896",rose:"#F43F5E",
  text:"#E2E5F1",muted:"#8B95B8",dim:"#252A45",
};

const inputStyle={width:"100%",background:T.s2,border:`1px solid ${T.dim}`,color:T.text,borderRadius:9,padding:"10px 13px",fontSize:13,outline:"none"};

const ERROR_MESSAGES = {
  OAuthAccountNotLinked: "That email is already linked to a different sign-in method.",
  AccessDenied: "Access denied.",
  Configuration: "Sign-in isn't configured yet — the app owner needs to add Google OAuth credentials.",
  CredentialsSignin: "Incorrect email or password.",
};

function SignInInner(){
  const {data:session}=useSession();
  const googleConfigured=useGoogleConfigured();
  const params=useSearchParams();
  const callbackUrl=params.get("callbackUrl")||"/app";
  const urlError=params.get("error");
  const [notConfigured,setNotConfigured]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  if(session?.user){
    if(typeof window!=="undefined")window.location.href=callbackUrl;
    return null;
  }

  const handleGoogle=()=>{
    if(googleConfigured===false){setNotConfigured(true);return;}
    signIn("google",{callbackUrl});
  };

  const handleCredentials=async(e)=>{
    e.preventDefault();
    setError("");setLoading(true);
    const res=await signIn("credentials",{email,password,redirect:false});
    if(res?.error){setError("Incorrect email or password.");setLoading(false);return;}
    window.location.href=callbackUrl;
  };

  return <div style={{background:T.bg,color:T.text,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',-apple-system,sans-serif",padding:24}}>
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:18,padding:"40px 36px",width:"100%",maxWidth:380}}>
      <div style={{width:44,height:44,borderRadius:12,margin:"0 auto 18px",background:`linear-gradient(135deg,${T.primary},${T.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
      <h1 style={{fontSize:20,fontWeight:800,marginBottom:6,textAlign:"center"}}>Sign in to FLUXE</h1>
      <p style={{color:T.muted,fontSize:13,marginBottom:22,lineHeight:1.5,textAlign:"center"}}>Start your free {TRIAL_DAYS}-day trial — no card required.</p>
      {urlError&&<div style={{background:"rgba(244,63,94,.1)",border:`1px solid ${T.rose}30`,borderRadius:8,padding:"10px 14px",marginBottom:16,color:T.rose,fontSize:12}}>{ERROR_MESSAGES[urlError]||"Something went wrong signing you in."}</div>}
      {notConfigured&&<div style={{background:"rgba(245,166,35,.1)",border:"1px solid rgba(245,166,35,.3)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#F5A623",fontSize:12}}>Google sign-in isn't set up yet — use email below instead.</div>}
      {error&&<div style={{background:"rgba(244,63,94,.1)",border:`1px solid ${T.rose}30`,borderRadius:8,padding:"10px 14px",marginBottom:16,color:T.rose,fontSize:12}}>⚠️ {error}</div>}

      <button onClick={handleGoogle} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",color:"#1f1f1f",border:"none",borderRadius:10,padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.9C34.5 3.3 29.8 1 24 1 14.9 1 7.1 6.4 3.5 14.1l7 5.4C12.3 13.7 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.2 5.6c4.2-3.9 6.7-9.6 6.7-17.3z"/><path fill="#FBBC05" d="M10.5 19.5l-7-5.4C1.9 17.7 1 20.7 1 24s.9 6.3 2.5 9.9l7-5.4C10.2 27 10 25.5 10 24s.2-3 .5-4.5z"/><path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.4 0-11.7-4.2-13.5-9.9l-7 5.4C7.1 41.6 14.9 47 24 47z"/></svg>
        Continue with Google
      </button>

      <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0"}}>
        <div style={{flex:1,height:1,background:T.dim}}/>
        <span style={{color:T.dim,fontSize:11}}>OR</span>
        <div style={{flex:1,height:1,background:T.dim}}/>
      </div>

      <form onSubmit={handleCredentials} style={{display:"flex",flexDirection:"column",gap:12}}>
        <input type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/>
        <input type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/>
        <button type="submit" disabled={loading} style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:"#fff",fontWeight:700,fontSize:14,borderRadius:9,padding:"11px",cursor:loading?"not-allowed":"pointer",opacity:loading?.6:1}}>
          {loading?"Signing in…":"Sign in with email"}
        </button>
      </form>

      <div style={{marginTop:20,textAlign:"center",display:"flex",flexDirection:"column",gap:8}}>
        <a href="/signup" style={{color:T.muted,fontSize:12,textDecoration:"none"}}>Don't have an account? Sign up</a>
        <a href="/" style={{color:T.dim,fontSize:12,textDecoration:"none"}}>← Back to home</a>
      </div>
    </div>
  </div>;
}

export default function SignInPage(){
  return <Suspense fallback={null}><SignInInner/></Suspense>;
}

"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { TRIAL_DAYS } from "@/lib/plans";

const T = {
  bg:"#06070F",s1:"#0D0F1E",s2:"#131628",border:"rgba(255,255,255,0.08)",
  primary:"#5B5FED",cyan:"#06B6D4",teal:"#00C896",rose:"#F43F5E",dim:"#252A45",
  text:"#E2E5F1",muted:"#8B95B8",
};

const inputStyle={width:"100%",background:T.s2,border:`1px solid ${T.dim}`,color:T.text,borderRadius:9,padding:"10px 13px",fontSize:13,outline:"none"};

export default function SignUpPage(){
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const submit=async(e)=>{
    e.preventDefault();
    setError("");setLoading(true);
    try{
      const res=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});
      const d=await res.json();
      if(d.error)throw new Error(d.error);
      const signInRes=await signIn("credentials",{email,password,redirect:false});
      if(signInRes?.error)throw new Error("Account created, but sign-in failed — try signing in manually.");
      window.location.href="/app";
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  return <div style={{background:T.bg,color:T.text,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',-apple-system,sans-serif",padding:24}}>
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:18,padding:"40px 36px",width:"100%",maxWidth:380}}>
      <div style={{width:44,height:44,borderRadius:12,margin:"0 auto 18px",background:`linear-gradient(135deg,${T.primary},${T.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
      <h1 style={{fontSize:20,fontWeight:800,marginBottom:6,textAlign:"center"}}>Create your FLUXE account</h1>
      <p style={{color:T.muted,fontSize:13,marginBottom:22,lineHeight:1.5,textAlign:"center"}}>Free {TRIAL_DAYS}-day trial — no card required.</p>
      {error&&<div style={{background:"rgba(244,63,94,.1)",border:`1px solid ${T.rose}30`,borderRadius:8,padding:"10px 14px",marginBottom:16,color:T.rose,fontSize:12}}>⚠️ {error}</div>}
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} style={inputStyle}/>
        <input type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/>
        <input type="password" required placeholder="Password (min 8 characters)" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle}/>
        <button type="submit" disabled={loading} style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,border:"none",color:"#fff",fontWeight:700,fontSize:14,borderRadius:9,padding:"11px",cursor:loading?"not-allowed":"pointer",opacity:loading?.6:1}}>
          {loading?"Creating account…":"Start free trial"}
        </button>
      </form>
      <div style={{marginTop:20,textAlign:"center",display:"flex",flexDirection:"column",gap:8}}>
        <a href="/signin" style={{color:T.muted,fontSize:12,textDecoration:"none"}}>Already have an account? Sign in</a>
        <a href="/" style={{color:T.dim,fontSize:12,textDecoration:"none"}}>← Back to home</a>
      </div>
    </div>
  </div>;
}

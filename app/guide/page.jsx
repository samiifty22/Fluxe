const T = {
  bg:"#06070F",s1:"#0D0F1E",border:"rgba(255,255,255,0.08)",
  primary:"#5B5FED",cyan:"#06B6D4",teal:"#00C896",amber:"#F5A623",
  text:"#E2E5F1",muted:"#8B95B8",dim:"#252A45",
};

const STEPS = [
  {
    n: 1,
    title: "Sign up and start your free trial",
    body: "Click \"Start free trial\" on the homepage and continue with your Google account. You get full access to all 8 agents for 3 days — no card required.",
  },
  {
    n: 2,
    title: "Connect Claude (required)",
    body: "Product Scout, Creative Studio and the command assistant all run on Claude. Get a key at console.anthropic.com → API Keys, then add it in your dashboard's Settings page.",
  },
  {
    n: 3,
    title: "Connect your store & ad accounts (optional but recommended)",
    body: "Add Shopify, Meta, TikTok, CJ Dropshipping and ShipBob credentials in Settings to replace simulated data with your real store. Every agent works in demo mode until you do — nothing breaks if you skip a integration.",
  },
  {
    n: 4,
    title: "Run your first product through the pipeline",
    body: "Go to Product Scout, generate ideas for your niche, then \"Add to Pipeline\". From there, open each stage (Supplier → Creative → Ad Launch → Store → Fulfillment) directly from the Pipeline page — each one prefills with that product and reports back automatically.",
  },
  {
    n: 5,
    title: "Pick a plan when your trial ends",
    body: "After 3 days you'll be asked to subscribe — $20/month or $100/year, both with every feature included. Cancel anytime from the billing portal.",
  },
];

const KEYS = [
  {k:"ANTHROPIC_API_KEY",l:"Anthropic API Key",docs:"console.anthropic.com",required:true},
  {k:"SHOPIFY_ACCESS_TOKEN / SHOPIFY_STORE_DOMAIN",l:"Shopify",docs:"shopify.dev",required:false},
  {k:"META_ACCESS_TOKEN / META_AD_ACCOUNT_ID",l:"Meta Ads",docs:"developers.facebook.com",required:false},
  {k:"TIKTOK_ACCESS_TOKEN / TIKTOK_ADVERTISER_ID",l:"TikTok Ads",docs:"ads.tiktok.com/marketing_api",required:false},
  {k:"CJ_API_KEY / CJ_EMAIL",l:"CJ Dropshipping",docs:"cjdropshipping.com",required:false},
  {k:"SHIPBOB_TOKEN",l:"ShipBob",docs:"developer.shipbob.com",required:false},
];

export const metadata = { title: "Setup Guide — FLUXE" };

export default function GuidePage(){
  return <div style={{background:T.bg,color:T.text,minHeight:"100vh",fontFamily:"'Inter',-apple-system,sans-serif"}}>
    <div style={{maxWidth:760,margin:"0 auto",padding:"60px 24px 90px"}}>
      <a href="/" style={{color:T.dim,fontSize:12,textDecoration:"none"}}>← Back to home</a>
      <h1 style={{fontSize:32,fontWeight:800,letterSpacing:-.5,margin:"18px 0 10px"}}>Getting set up with FLUXE</h1>
      <p style={{color:T.muted,fontSize:15,marginBottom:44,lineHeight:1.6}}>Five steps from sign-up to your first automated product launch.</p>

      <div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:56}}>
        {STEPS.map(s=><div key={s.n} style={{display:"flex",gap:16,background:T.s1,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px 20px"}}>
          <div style={{flexShrink:0,width:30,height:30,borderRadius:"50%",background:`${T.primary}20`,border:`1px solid ${T.primary}50`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:T.primary}}>{s.n}</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:5}}>{s.title}</div>
            <div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{s.body}</div>
          </div>
        </div>)}
      </div>

      <h2 style={{fontSize:20,fontWeight:800,marginBottom:14}}>Integration keys reference</h2>
      <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
        {KEYS.map((k,i)=><div key={k.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:i<KEYS.length-1?`1px solid ${T.border}`:"none"}}>
          <div>
            <div style={{fontWeight:600,fontSize:13}}>{k.l}{k.required&&<span style={{color:T.amber,marginLeft:6,fontSize:11}}>required</span>}</div>
            <code style={{color:T.muted,fontSize:11}}>{k.k}</code>
          </div>
          <a href={`https://${k.docs}`} target="_blank" rel="noopener noreferrer" style={{color:T.teal,fontSize:12,textDecoration:"none"}}>docs →</a>
        </div>)}
      </div>

      <p style={{color:T.dim,fontSize:12,marginTop:24,lineHeight:1.6}}>
        Add these in your dashboard's Settings page (found under the ⚙️ icon once signed in). Any integration you skip simply runs in simulated/demo mode until you connect it — nothing else stops working.
      </p>
    </div>
  </div>;
}

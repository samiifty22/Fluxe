"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  bg:"#06070F",s1:"#0D0F1E",s2:"#131628",border:"rgba(255,255,255,0.07)",
  primary:"#5B5FED",teal:"#00C896",orange:"#FF6B35",amber:"#F5A623",
  rose:"#F43F5E",purple:"#A855F7",cyan:"#06B6D4",
  text:"#E2E5F1",muted:"#6B7A99",dim:"#252A45",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function api(endpoint, body) {
  const opts = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { method: "GET" };
  const res  = await fetch(endpoint, opts);
  return res.json();
}
async function ai(prompt) {
  const d = await api("/api/claude", { prompt });
  if (d.error) throw new Error(d.error);
  return d.text;
}
// AI models occasionally emit near-valid JSON (trailing decimal points like "39.",
// trailing commas, or stray prose/code fences around the array) — repair before parsing.
function parseAIJson(raw) {
  let s = String(raw ?? "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = s.search(/[[{]/);
  const open = s[start];
  const close = open === "[" ? "]" : "}";
  const end = s.lastIndexOf(close);
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON found in AI response");
  s = s.slice(start, end + 1);
  s = s.replace(/(\d)\.(?=\s*[,\]}])/g, "$1.0").replace(/,\s*([\]}])/g, "$1");
  return JSON.parse(s);
}
function relTime(ms) {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
const AGENTS_DEF = [
  {id:"scout",      icon:"🔍",name:"Product Scout",   color:T.primary,status:"running",  metric:"12 today",  api:"Claude AI + Minea"},
  {id:"supplier",   icon:"🏭",name:"Supplier Connect",color:T.teal,   status:"running",  metric:"8 active",  api:"CJ + 1688"},
  {id:"creative",   icon:"🎨",name:"Creative Studio", color:T.purple, status:"running",  metric:"24/week",   api:"Claude AI"},
  {id:"adlaunch",   icon:"📢",name:"Ad Launch",       color:T.orange, status:"idle",     metric:"$1,240",    api:"Meta + TikTok"},
  {id:"store",      icon:"🛍️",name:"Store Manager",   color:T.teal,   status:"completed",metric:"14 live",   api:"Shopify"},
  {id:"fulfillment",icon:"📦",name:"Fulfillment",     color:T.amber,  status:"running",  metric:"98.2% OT",  api:"ShipBob"},
  {id:"analytics",  icon:"📊",name:"Analytics",       color:T.cyan,   status:"running",  metric:"2.4× ROAS", api:"Meta Insights"},
  {id:"finance",    icon:"💰",name:"Finance",         color:T.rose,   status:"idle",     metric:"$3,820 MTD",api:"Stripe"},
];
const NAV=[
  {id:"overview",icon:"⚡",label:"Overview"},
  {id:"pipeline",icon:"🔄",label:"Pipeline"},
  {id:"scout",   icon:"🔍",label:"Product Scout"},
  {id:"supplier",icon:"🏭",label:"Supplier"},
  {id:"creative",icon:"🎨",label:"Creative Studio"},
  {id:"adlaunch",icon:"📢",label:"Ad Launch"},
  {id:"store",   icon:"🛍️",label:"Store Manager"},
  {id:"fulfillment",icon:"📦",label:"Fulfillment"},
  {id:"analytics",icon:"📊",label:"Analytics"},
  {id:"finance", icon:"💰",label:"Finance"},
  {id:"settings",icon:"⚙️",label:"Settings"},
];
const NICHES=["Home & Kitchen","Pet Products","Beauty & Skincare","Fitness & Wellness","Tech Gadgets","Baby Products","Fashion Accessories","Outdoor & Camping"];
const FORMATS=["TikTok UGC Script","Meta Ad Copy","Product Description","Email Sequence","Instagram Caption"];
const TONES=["Energetic & Fun","Trustworthy & Calm","Luxury & Premium","Urgent & FOMO","Educational"];
const PLATS=["Both (Meta + TikTok)","Meta Only","TikTok Only"];
const OBJS=["Conversions","Traffic","Awareness","Lead Generation"];
const STAGE_LABELS={research:"Research",supplier:"Supplier",creative:"Creative",adlaunch:"Ad Launch",store:"Store",fulfillment:"Fulfillment"};
const STAGE_ICONS={research:"🔍",supplier:"🏭",creative:"🎨",adlaunch:"📢",store:"🛍️",fulfillment:"📦"};
const STAGE_ORDER=["research","supplier","creative","adlaunch","store","fulfillment"];

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const css=`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}input,select{color-scheme:dark}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${T.dim};border-radius:4px}table{border-collapse:collapse;width:100%}th{color:${T.muted};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:8px 12px;text-align:left;border-bottom:1px solid ${T.border}}td{padding:10px 12px;font-size:13px;border-bottom:1px solid ${T.border}}
@media (max-width:768px){
  .fluxe-sidebar{width:100% !important;height:56px !important;min-height:56px !important;flex-direction:row !important;position:fixed !important;left:0 !important;top:auto !important;bottom:0 !important;padding:0 8px !important;overflow-x:auto !important;overflow-y:hidden !important;border-right:none !important;border-top:1px solid ${T.border} !important;justify-content:flex-start !important;gap:4px !important;z-index:200}
  .fluxe-logo{display:none !important}
  .fluxe-main{margin-left:0 !important;padding:16px 14px 76px !important;max-width:100% !important}
  .fluxe-topbar{flex-wrap:wrap !important;gap:8px !important}
}`;

const Card=({children,style={}})=><div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px 20px",...style}}>{children}</div>;
const Label=({c})=><div style={{color:T.muted,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{c}</div>;
const Badge=({label,color,bg})=><span style={{background:bg,color,fontSize:10,fontWeight:700,borderRadius:6,padding:"2px 8px",letterSpacing:.8,whiteSpace:"nowrap"}}>{label}</span>;
const Dot=({color,anim})=><div style={{width:6,height:6,borderRadius:"50%",background:color,animation:anim?"pulse 1.5s infinite":"none",flexShrink:0}}/>;

function Btn({label,onClick,disabled,color=T.primary,small=false,ghost=false,full=false}){
  return <button onClick={onClick} disabled={disabled} style={{
    background:disabled?T.dim:ghost?"transparent":`linear-gradient(135deg,${color},${color}cc)`,
    border:ghost?`1px solid ${T.dim}`:"none",color:ghost?T.muted:"#fff",
    borderRadius:9,padding:small?"5px 13px":"9px 22px",fontSize:small?11:13,fontWeight:700,
    cursor:disabled?"not-allowed":"pointer",opacity:disabled?.6:1,
    whiteSpace:"nowrap",transition:"all .2s",width:full?"100%":"auto",
  }}>{label}</button>;
}

function Field({label,value,onChange,type="text",opts=null,placeholder=""}){
  const s={width:"100%",background:T.s2,border:`1px solid ${T.dim}`,color:T.text,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"};
  return <div><Label c={label}/>{opts
    ?<select value={value} onChange={e=>onChange(e.target.value)} style={s}>{opts.map(o=><option key={o}>{o}</option>)}</select>
    :<input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(type==="number"?Number(e.target.value):e.target.value)} style={s}/>}
  </div>;
}

function Empty({icon,title,sub,spin=false}){
  return <div style={{textAlign:"center",padding:"56px 0"}}>
    <div style={{fontSize:40,display:"inline-block",animation:spin?"spin 2s linear infinite":"none",marginBottom:12}}>{icon}</div>
    <div style={{color:T.muted,fontWeight:700,fontSize:15,marginBottom:4}}>{title}</div>
    <div style={{color:T.dim,fontSize:13}}>{sub}</div>
  </div>;
}

function Pill({st}){
  const m={running:{l:"Running",c:T.teal},idle:{l:"Idle",c:T.muted},completed:{l:"Done",c:T.primary},active:{l:"Active",c:T.teal},paused:{l:"Paused",c:T.muted},in_transit:{l:"In Transit",c:T.primary},delivered:{l:"Delivered",c:T.teal},processing:{l:"Processing",c:T.amber},done:{l:"Done",c:T.teal},pending:{l:"Pending",c:T.dim},error:{l:"Error",c:T.rose}}[st]||{l:st,c:T.muted};
  return <span style={{background:`${m.c}18`,color:m.c,fontSize:10,fontWeight:700,borderRadius:20,padding:"3px 10px",display:"inline-flex",alignItems:"center",gap:5}}><Dot color={m.c} anim={["running","active","in_transit"].includes(st)}/>{m.l}</span>;
}

function TabBar({tabs,active,set}){
  return <div style={{display:"flex",gap:2,borderBottom:`1px solid ${T.border}`,marginBottom:18}}>
    {tabs.map(t=><button key={t.id} onClick={()=>set(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:active===t.id?T.primary:T.muted,fontWeight:active===t.id?700:500,fontSize:13,padding:"7px 15px",borderBottom:active===t.id?`2px solid ${T.primary}`:"2px solid transparent",transition:"all .15s"}}>{t.l}</button>)}
  </div>;
}

function TipBox({active,payload,label}){
  if(!active||!payload?.length)return null;
  return <div style={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 13px"}}>
    <div style={{color:T.muted,fontSize:11,marginBottom:5}}>{label}</div>
    {payload.map(p=><div key={p.dataKey} style={{color:p.color,fontSize:12,fontWeight:700}}>{p.name}: {p.value}</div>)}
  </div>;
}

function PHdr({title,sub,action=null}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
    <div><h1 style={{color:T.text,fontSize:21,fontWeight:800,margin:0,letterSpacing:-.5}}>{title}</h1><div style={{color:T.muted,fontSize:13,marginTop:3}}>{sub}</div></div>
    {action}
  </div>;
}

function KPIs({items}){
  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:11,marginBottom:22}}>
    {items.map(k=><Card key={k.l} style={{padding:"14px 16px"}}><Label c={k.l}/><div style={{color:k.c,fontSize:22,fontWeight:800}}>{k.v}</div>{k.sub&&<div style={{color:T.muted,fontSize:11,marginTop:2}}>{k.sub}</div>}</Card>)}
  </div>;
}

function SourceBadge({source}){
  if(!source)return null;
  const live=source.includes("Live");
  return <div style={{display:"inline-flex",alignItems:"center",gap:5,background:live?`${T.teal}10`:`${T.amber}10`,border:`1px solid ${live?T.teal:T.amber}30`,borderRadius:20,padding:"2px 10px",marginBottom:12}}>
    <Dot color={live?T.teal:T.amber} anim={live}/>
    <span style={{color:live?T.teal:T.amber,fontSize:11,fontWeight:700}}>{source}</span>
  </div>;
}

function TrialBadge({user}){
  if(user.billingStatus==="active")return <Badge label={`${user.plan==="yearly"?"Yearly":"Monthly"} plan`} color={T.teal} bg={`${T.teal}18`}/>;
  if(!user.trialEndsAt)return null;
  const daysLeft=Math.max(0,Math.ceil((new Date(user.trialEndsAt).getTime()-Date.now())/86400000));
  return <Badge label={daysLeft>0?`Trial · ${daysLeft}d left`:"Trial expired"} color={daysLeft>0?T.amber:T.rose} bg={daysLeft>0?"rgba(245,166,35,.12)":"rgba(244,63,94,.12)"}/>;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({page,set}){
  return <div className="fluxe-sidebar" style={{width:60,minHeight:"100vh",background:T.s1,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:14,gap:2,position:"fixed",left:0,top:0,zIndex:200}}>
    <div className="fluxe-logo" style={{width:34,height:34,borderRadius:9,marginBottom:16,background:`linear-gradient(135deg,${T.primary},${T.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 4px 18px ${T.primary}55`,flexShrink:0}}>⚡</div>
    {NAV.map(n=><button key={n.id} onClick={()=>set(n.id)} title={n.label} style={{width:42,height:42,flexShrink:0,borderRadius:9,border:"none",cursor:"pointer",background:page===n.id?`${T.primary}22`:"transparent",outline:page===n.id?`1px solid ${T.primary}50`:"none",fontSize:18,transition:"all .15s",position:"relative"}}>
      {n.icon}
      {page===n.id&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,background:T.primary,borderRadius:"0 3px 3px 0"}}/>}
    </button>)}
  </div>;
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({goal,setGoal,agents,analytics}){
  const [ed,setEd]=useState(false);const [dr,setDr]=useState(goal);
  const [pipelineItems,setPipelineItems]=useState([]);
  useEffect(()=>{api("/api/pipeline").then(d=>setPipelineItems(d.items??[])).catch(()=>{});},[]);
  const budget=Math.round(goal*.3),roi=Math.round(((goal-budget)/budget)*100);
  const active=agents.filter(a=>a.on).length;
  const pipe=["scout","supplier","creative","store","adlaunch","fulfillment","analytics"];
  const ACT=useMemo(()=>{
    const events=[];
    for(const item of pipelineItems){
      events.push({ts:new Date(item.addedAt).getTime(),ag:"Scout",m:`"${item.name}" added to pipeline`,tp:"info"});
      for(const stageId of STAGE_ORDER){
        const st=item.stages?.[stageId];
        if(st?.status==="done"&&st.completedAt){
          events.push({ts:new Date(st.completedAt).getTime(),ag:STAGE_LABELS[stageId]??stageId,m:`${STAGE_LABELS[stageId]??stageId} completed for "${item.name}"`,tp:"ok"});
        }
      }
    }
    events.sort((a,b)=>b.ts-a.ts);
    return events.slice(0,6).map(e=>({t:relTime(e.ts),ag:e.ag,m:e.m,tp:e.tp}));
  },[pipelineItems]);
  const tC={ok:T.teal,warn:T.amber,info:T.primary};
  const roas=analytics?.summary?.avgRoas??2.4;
  const rev=analytics?.summary?.totalRevenue??10340;
  return <div>
    <div style={{background:"rgba(91,95,237,0.1)",border:"1px solid rgba(91,95,237,0.28)",borderRadius:16,padding:"22px 26px",marginBottom:22,display:"flex",alignItems:"center",gap:28,flexWrap:"wrap"}}>
      <div style={{minWidth:190}}>
        <Label c="Monthly Revenue Goal"/>
        {ed?<div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:T.primary,fontSize:26,fontWeight:800}}>$</span>
          <input autoFocus type="number" value={dr} onChange={e=>setDr(e.target.value)} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${T.primary}`,borderRadius:8,color:T.text,fontSize:24,fontWeight:800,width:120,padding:"2px 8px",outline:"none"}}/>
          <Btn label="Set" small onClick={()=>{setGoal(Number(dr));setEd(false);}}/>
        </div>:<div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:T.text,fontSize:34,fontWeight:800,letterSpacing:-1}}>${goal.toLocaleString()}</span>
          <Btn label="Edit" small ghost onClick={()=>setEd(true)}/>
        </div>}
      </div>
      {[["Ad Budget",`$${budget.toLocaleString()}`,"30% of goal",T.orange],["Projected ROI",`${roi}%`,"at "+roas+"× ROAS",T.teal],["Est. Net Profit",`$${Math.round(goal*.38).toLocaleString()}`,"38% margin",T.purple],["Break-even",`$${Math.round(budget*.6).toLocaleString()}`,"in revenue",T.cyan]].map(([l,v,s,c])=>(
        <div key={l}><Label c={l}/><div style={{color:c,fontSize:24,fontWeight:800,lineHeight:1}}>{v}</div><div style={{color:T.muted,fontSize:11,marginTop:2}}>{s}</div></div>
      ))}
    </div>
    <Card style={{marginBottom:22}}>
      <Label c="Live Pipeline"/>
      <div style={{display:"flex",alignItems:"center",overflowX:"auto",paddingBottom:4}}>
        {pipe.map((id,i)=>{const ag=AGENTS_DEF.find(a=>a.id===id);const en=agents.find(a=>a.id===id)?.on;return <div key={id} style={{display:"flex",alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:en?`${ag.color}20`:T.s2,border:`2px solid ${en?ag.color:T.dim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,boxShadow:en&&ag.status==="running"?`0 0 14px ${ag.color}55`:"none"}}>{ag.icon}</div>
            <div style={{color:en?T.muted:T.dim,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{ag.name.split(" ")[0]}</div>
            <Dot color={en?ag.color:T.dim} anim={en&&ag.status==="running"}/>
          </div>
          {i<pipe.length-1&&<div style={{width:28,height:2,margin:"0 3px",marginBottom:20,background:en?`${ag.color}70`:T.dim}}/>}
        </div>;})}
      </div>
    </Card>
    <KPIs items={[{l:"Active Agents",v:`${active}/8`,c:T.primary},{l:"Revenue MTD",v:`$${rev.toLocaleString()}`,c:T.teal},{l:"Avg ROAS",v:`${roas}×`,c:T.cyan},{l:"Orders Today",v:analytics?.summary?.totalOrders??347,c:T.purple},{l:"Avg CAC",v:`$${analytics?.summary?.avgCac??16.4}`,c:T.orange},{l:"Net MTD",v:"$3,820",c:T.teal}]}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
      <Card>
        <Label c="Agent Status"/>
        <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:4}}>
          {agents.map(ag=><div key={ag.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15}}>{ag.icon}</span><span style={{color:ag.on?T.text:T.muted,fontSize:13,fontWeight:600}}>{ag.name}</span></div>
            <Pill st={ag.on?ag.status:"idle"}/>
          </div>)}
        </div>
      </Card>
      <Card>
        <Label c="Activity Feed"/>
        {ACT.length===0?<div style={{color:T.muted,fontSize:12,padding:"10px 0"}}>No activity yet — add a product in Product Scout to get started.</div>:ACT.map((a,i)=><div key={i} style={{display:"flex",gap:9,paddingBottom:9,borderBottom:i<ACT.length-1?`1px solid ${T.border}`:"none"}}>
          <Dot color={tC[a.tp]}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:6,marginBottom:1}}><span style={{color:T.text,fontSize:11,fontWeight:600}}>{a.ag}</span><span style={{color:T.dim,fontSize:10}}>{a.t==="just now"?a.t:`${a.t} ago`}</span></div>
            <div style={{color:T.muted,fontSize:11}}>{a.m}</div>
          </div>
        </div>)}
      </Card>
    </div>
  </div>;
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline({onNavigate,onOpenStage}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try{const d=await api("/api/pipeline");setItems(d.items??[]);}catch{}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const advance=async(item,stage,pageNav)=>{
    await api("/api/pipeline",{action:"update",id:item.id,stage,status:"done",data:{}});
    load();
    if(pageNav)onNavigate(pageNav);
  };
  const remove=async(id)=>{
    await api("/api/pipeline",{action:"remove",id});
    setItems(p=>p.filter(i=>i.id!==id));
  };

  if(loading)return <Empty icon="🔄" title="Loading pipeline…" spin/>;
  return <div>
    <PHdr title="Pipeline" sub="Track every product from research to fulfillment"/>
    {!items.length?<div>
      <Empty icon="🔄" title="Pipeline is empty" sub="Scout a product and click 'Add to Pipeline' to start"/>
      <div style={{textAlign:"center",marginTop:16}}><Btn label="→ Go to Product Scout" onClick={()=>onNavigate("scout")}/></div>
    </div>:<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {items.map(item=>{
        const curr=STAGE_ORDER.indexOf(item.currentStage);
        return <Card key={item.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{color:T.text,fontWeight:800,fontSize:16}}>{item.name}</div>
              <div style={{color:T.muted,fontSize:12,marginTop:2}}>Added {new Date(item.addedAt).toLocaleDateString()} · Sell ${item.sellPrice} · Source ${item.sourcingCost} · Margin {item.margin}%</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Badge label={item.currentStage==="complete"?"✅ Complete":`→ ${STAGE_LABELS[item.currentStage]??item.currentStage}`} color={item.currentStage==="complete"?T.teal:T.primary} bg={item.currentStage==="complete"?`${T.teal}15`:`${T.primary}15`}/>
              <button onClick={()=>remove(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.dim,fontSize:18}}>×</button>
            </div>
          </div>
          {/* Stage progress */}
          <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:16,overflowX:"auto"}}>
            {STAGE_ORDER.map((s,i)=>{
              const st=item.stages[s]?.status??"pending";
              const isCurr=item.currentStage===s;
              const col=st==="done"?T.teal:isCurr?T.primary:T.dim;
              return <div key={s} style={{display:"flex",alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`${col}20`,border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:isCurr?`0 0 12px ${col}55`:"none"}}>
                    {st==="done"?"✓":STAGE_ICONS[s]}
                  </div>
                  <div style={{color:col,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{STAGE_LABELS[s]}</div>
                </div>
                {i<STAGE_ORDER.length-1&&<div style={{width:24,height:2,margin:"0 4px",marginBottom:18,background:st==="done"?T.teal:T.dim}}/>}
              </div>;
            })}
          </div>
          {/* Action for current stage */}
          {item.currentStage!=="complete"&&<div style={{background:`${T.primary}0a`,border:`1px solid ${T.primary}20`,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{color:T.muted,fontSize:13}}>Next: <strong style={{color:T.text}}>{STAGE_LABELS[item.currentStage]}</strong> — {
              item.currentStage==="supplier"?"Find the best supplier for this product":
              item.currentStage==="creative"?"Generate ad scripts and copy":
              item.currentStage==="adlaunch"?"Launch Meta + TikTok campaigns":
              item.currentStage==="store"?"List this product on Shopify":
              item.currentStage==="fulfillment"?"Set up fulfillment routing":""}</div>
            <div style={{display:"flex",gap:8}}>
              <Btn label={`Open ${STAGE_LABELS[item.currentStage]}`} small onClick={()=>onOpenStage(item)}/>
              <Btn label="Mark Done ✓" small ghost onClick={()=>advance(item,item.currentStage,null)}/>
            </div>
          </div>}
        </Card>;
      })}
    </div>}
  </div>;
}

// ─── SCOUT ────────────────────────────────────────────────────────────────────
function Scout({onLaunch,onAddPipeline}){
  const [niche,setNiche]=useState("Home & Kitchen");
  const [budget,setBudget]=useState(1000);
  const [demo,setDemo]=useState("US adults 25–44");
  const [loading,setLoading]=useState(false);
  const [products,setProducts]=useState([]);
  const [error,setError]=useState("");
  const [adding,setAdding]=useState({});

  const run=async()=>{
    setLoading(true);setError("");setProducts([]);
    try{
      const raw=await ai(`Expert dropshipping researcher, US market 2026. Budget $${budget}/mo, niche: ${niche}, demographic: ${demo}, Chinese supplier w/ US warehouse (3-5d delivery).
Return ONLY raw JSON array of 5 products. Fields: name,tagline,sourcingCost(num),sellPrice(num),margin(int%),weightLbs,usWarehouseAvailable(bool),viralityScore(1-100),adAngle,tiktokHook,targetAudience,competitionLevel(low|medium|high),avgShippingDays,whyItWins`);
      setProducts(parseAIJson(raw));
    }catch(e){setError("Error — "+e.message);}
    setLoading(false);
  };

  const addPipeline=async(p)=>{
    setAdding(a=>({...a,[p.name]:true}));
    try{
      await api("/api/pipeline",{action:"add",product:p});
      onAddPipeline?.();
    }catch{}
    setAdding(a=>({...a,[p.name]:false}));
  };

  return <div>
    <PHdr title="Product Scout" sub="AI-powered product research — Claude API"/>
    <Card style={{marginBottom:18}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:14}}>
        <Field label="Niche" value={niche} onChange={setNiche} opts={NICHES}/>
        <Field label="Budget ($/mo)" value={budget} onChange={setBudget} type="number"/>
        <Field label="Target Demographic" value={demo} onChange={setDemo}/>
      </div>
      <Btn label={loading?"Scanning…":"🔍 Find Products"} onClick={run} disabled={loading}/>
    </Card>
    {loading&&<Empty icon="🔍" title="Scout Agent Running…" sub={`Analyzing ${niche} with Claude AI`} spin/>}
    {error&&<Card style={{borderColor:"rgba(244,63,94,.3)",marginBottom:14}}><span style={{color:T.rose,fontWeight:700}}>⚠️ {error}</span></Card>}
    {products.length>0&&<div>
      <div style={{color:T.muted,fontSize:13,marginBottom:14}}>✅ Found <strong style={{color:T.teal}}>{products.length} winning products</strong> in {niche}</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {products.map((p,i)=>{
          const m=p.margin??Math.round(((p.sellPrice-p.sourcingCost)/p.sellPrice)*100);
          return <Card key={i} style={{borderLeft:`3px solid ${i===0?T.primary:T.dim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
                  <div style={{width:26,height:26,borderRadius:7,background:`${T.primary}20`,border:`1px solid ${T.primary}40`,display:"flex",alignItems:"center",justifyContent:"center",color:T.primary,fontSize:12,fontWeight:800}}>#{i+1}</div>
                  <div style={{color:T.text,fontWeight:700,fontSize:15}}>{p.name}</div>
                  {p.usWarehouseAvailable&&<Badge label="🇺🇸 US Stock" color={T.teal} bg="rgba(0,200,150,.12)"/>}
                </div>
                <div style={{color:T.muted,fontSize:13}}>{p.tagline}</div>
              </div>
              <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
                {[["Source",`$${p.sourcingCost}`,T.muted],["Sell",`$${p.sellPrice}`,T.text],["Margin",`${m}%`,T.teal],["Virality",p.viralityScore+"/100",p.viralityScore>=80?T.teal:T.amber]].map(([l,v,c])=><div key={l}><Label c={l}/><div style={{color:c,fontSize:17,fontWeight:800}}>{v}</div></div>)}
              </div>
            </div>
            <div style={{background:`${T.primary}0f`,border:`1px solid ${T.primary}20`,borderRadius:8,padding:"8px 12px",marginBottom:10}}>
              <span style={{color:T.primary,fontWeight:700,fontSize:11}}>WHY IT WINS  </span>
              <span style={{color:T.muted,fontSize:12}}>{p.whyItWins}</span>
            </div>
            <div style={{background:T.s2,borderRadius:8,padding:"9px 12px",marginBottom:10}}>
              <Label c="TikTok Hook (0–3 sec)"/><div style={{color:T.text,fontSize:13,fontStyle:"italic"}}>"{p.tiktokHook}"</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn label={adding[p.name]?"Adding…":"+ Add to Pipeline"} small onClick={()=>addPipeline(p)} disabled={!!adding[p.name]} color={T.teal}/>
              <Btn label="→ Launch Ad Campaign" small onClick={()=>onLaunch(p)} color={T.orange}/>
            </div>
          </Card>;
        })}
      </div>
    </div>}
    {!loading&&!products.length&&!error&&<Empty icon="🔍" title="Scout Agent Ready" sub="Configure your niche and budget, then run the scan"/>}
  </div>;
}

// ─── SUPPLIER ─────────────────────────────────────────────────────────────────
function Supplier({initial,onComplete}){
  const [q,setQ]=useState(initial?.name||"SpinSpice Rotating Spice Rack");
  const [loading,setLoading]=useState(false);
  const [res,setRes]=useState([]);
  const [source,setSource]=useState("");
  const [sel,setSel]=useState(null);
  const [linking,setLinking]=useState(false);

  const search=async()=>{
    setLoading(true);setRes([]);
    try{const d=await api("/api/supplier",{keyword:q});setRes(d.suppliers??[]);setSource(d.source??"");}
    catch(e){console.error(e);}
    setLoading(false);
  };

  const connect=async()=>{
    if(sel===null||!onComplete)return;
    setLinking(true);
    try{await onComplete(res[sel]);}
    finally{setLinking(false);}
  };

  return <div>
    <PHdr title="Supplier Connect" sub={initial?`Sourcing for pipeline item: ${initial.name}`:"Source products from Chinese suppliers with US warehouse stock"}/>
    <Card style={{marginBottom:18}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:220}}><Field label="Product to Source" value={q} onChange={setQ} placeholder="Enter product name or keyword"/></div>
        <Btn label={loading?"Searching…":"🏭 Find Suppliers"} onClick={search} disabled={loading} color={T.teal}/>
      </div>
    </Card>
    {source&&<SourceBadge source={source}/>}
    {loading&&<Empty icon="🏭" title="Searching supplier networks…" sub="Querying CJ Dropshipping and warehouse partners" spin/>}
    {res.length>0&&<div>
      <div style={{color:T.muted,fontSize:13,marginBottom:14}}>Found <strong style={{color:T.teal}}>{res.length} suppliers</strong> for "{q}"</div>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        {res.map((s,i)=><Card key={i} style={{cursor:"pointer",borderColor:sel===i?T.teal:T.border,transition:"all .2s"}} onClick={()=>setSel(sel===i?null:i)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:4}}>
                <div style={{color:T.text,fontWeight:700,fontSize:15}}>{s.name}</div>
                <Badge label={s.badge??""} color={s.badge?.includes("US")?T.teal:T.amber} bg={s.badge?.includes("US")?"rgba(0,200,150,.12)":"rgba(245,166,35,.12)"}/>
              </div>
              <div style={{color:T.muted,fontSize:12}}>MOQ: {s.moq??1} unit · ⭐ {s.rating??4.6} · {s.ship??""}</div>
            </div>
            <div style={{display:"flex",gap:20}}>
              {[["Unit Price",`$${s.price}`,T.teal],["Stock",(s.stock??0).toLocaleString(),T.text],["Margin @$39",`${Math.round(((39-s.price)/39)*100)}%`,T.primary]].map(([l,v,c])=><div key={l}><Label c={l}/><div style={{color:c,fontSize:17,fontWeight:800}}>{v}</div></div>)}
            </div>
            <Btn label={sel===i?"✓ Selected":"Select"} small ghost={sel!==i} color={T.teal} onClick={e=>{e.stopPropagation();setSel(sel===i?null:i);}}/>
          </div>
        </Card>)}
      </div>
      {sel!==null&&<div style={{marginTop:18,background:`${T.teal}0f`,border:`1px solid ${T.teal}30`,borderRadius:14,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div><div style={{color:T.teal,fontWeight:700}}>✓ {res[sel]?.name} selected</div><div style={{color:T.muted,fontSize:12,marginTop:2}}>{onComplete?"Ready to sync with Store Manager and Fulfillment agents":"Open this page from a Pipeline card to link a supplier choice"}</div></div>
        <Btn label={linking?"Connecting…":"Connect to Pipeline →"} color={T.teal} disabled={linking||!onComplete} onClick={connect}/>
      </div>}
    </div>}
    {!loading&&!res.length&&<Empty icon="🏭" title="Supplier Agent Ready" sub="Enter a product name to search supplier networks"/>}
  </div>;
}

// ─── CREATIVE ─────────────────────────────────────────────────────────────────
function Creative({initial,onComplete}){
  const [tab,setTab]=useState("gen");
  const [prod,setProd]=useState(initial?.name||"SpinSpice 360° Rotating Spice Rack");
  const [price,setPrice]=useState(initial?.sellPrice?String(initial.sellPrice):"39");
  const [fmt,setFmt]=useState(FORMATS[0]);
  const [tone,setTone]=useState(TONES[0]);
  const [usp,setUsp]=useState("Rotates 360°, fits all jars, saves cabinet space");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState([]);
  const [saved,setSaved]=useState([]);
  const [error,setError]=useState("");
  const [linking,setLinking]=useState(false);

  const linkDone=async()=>{
    if(!onComplete||!saved.length)return;
    setLinking(true);
    try{await onComplete(saved);}
    finally{setLinking(false);}
  };

  const fmtSchemas={
    "TikTok UGC Script":`[{"title":"","hook":"","script":"","cta":"","hashtags":[],"duration":""}]`,
    "Meta Ad Copy":`[{"title":"","headline":"","primaryText":"","description":"","cta":""}]`,
    "Product Description":`[{"title":"","heading":"","body":"","bullets":[],"cta":""}]`,
    "Email Sequence":`[{"title":"","subject":"","preheader":"","body":"","cta":""}]`,
    "Instagram Caption":`[{"title":"","caption":"","hashtags":[],"cta":""}]`,
  };

  const gen=async()=>{
    setLoading(true);setError("");setResults([]);
    try{
      const raw=await ai(`Expert e-commerce copywriter, US market 2026. Product: ${prod} ($${price}), tone: ${tone}, USP: ${usp}.
Generate 3 unique ${fmt} variations. Return ONLY raw JSON array. Schema: ${fmtSchemas[fmt]}`);
      setResults(parseAIJson(raw));
    }catch(e){setError("Error: "+e.message);}
    setLoading(false);
  };

  const colors=[T.purple,T.primary,T.cyan];
  return <div>
    <PHdr title="Creative Studio" sub={initial?`Writing creative for pipeline item: ${initial.name}`:"AI-powered ad copy, scripts and content — Claude API"}/>
    {onComplete&&<Card style={{marginBottom:18,borderColor:saved.length?"rgba(0,200,150,.3)":T.border}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{color:T.muted,fontSize:13}}>{saved.length?`${saved.length} creative(s) saved for this product.`:"Save at least one creative below, then mark this stage done."}</div>
        <Btn label={linking?"Linking…":"✓ Mark Creative Done & Return to Pipeline"} color={T.purple} disabled={linking||!saved.length} onClick={linkDone}/>
      </div>
    </Card>}
    <TabBar tabs={[{id:"gen",l:"✍️ Generate"},{id:"saved",l:`💾 Saved (${saved.length})`}]} active={tab} set={setTab}/>
    {tab==="gen"&&<div>
      <Card style={{marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14,marginBottom:14}}>
          <Field label="Product Name" value={prod} onChange={setProd}/>
          <Field label="Price ($)" value={price} onChange={setPrice} type="number"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:14}}>
          <Field label="Content Format" value={fmt} onChange={setFmt} opts={FORMATS}/>
          <Field label="Brand Tone" value={tone} onChange={setTone} opts={TONES}/>
        </div>
        <div style={{marginBottom:14}}><Field label="Unique Selling Point" value={usp} onChange={setUsp}/></div>
        <Btn label={loading?"✨ Generating…":"✨ Generate 3 Variations"} onClick={gen} disabled={loading} color={T.purple}/>
      </Card>
      {loading&&<Empty icon="🎨" title="Creative Studio Working…" sub={`Generating 3 ${fmt} variations with Claude`} spin/>}
      {error&&<Card style={{borderColor:"rgba(244,63,94,.3)",marginBottom:14}}><span style={{color:T.rose,fontWeight:700}}>⚠️ {error}</span></Card>}
      {results.length>0&&<div>
        <div style={{color:T.muted,fontSize:13,marginBottom:14}}>✅ Generated <strong style={{color:T.purple}}>{results.length}</strong> {fmt} variations</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {results.map((r,i)=><Card key={i} style={{borderLeft:`3px solid ${colors[i]}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{color:T.text,fontWeight:700,fontSize:14}}>{r.title||`Variation ${i+1}`}</div>
              <Btn label="💾 Save" small ghost onClick={()=>setSaved(p=>[...p,{...r,fmt,savedAt:new Date().toLocaleTimeString()}])}/>
            </div>
            {r.hook&&<div style={{background:`${T.orange}12`,border:`1px solid ${T.orange}25`,borderRadius:8,padding:"9px 12px",marginBottom:10}}><Label c="Hook (0–3 sec)"/><div style={{color:T.text,fontSize:13,fontStyle:"italic"}}>"{r.hook}"</div></div>}
            {r.script&&<div style={{marginBottom:8}}><Label c="Script"/><div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{r.script}</div></div>}
            {r.headline&&<div style={{marginBottom:8}}><div style={{color:T.text,fontSize:15,fontWeight:700}}>{r.headline}</div></div>}
            {r.primaryText&&<div style={{marginBottom:8}}><div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{r.primaryText}</div></div>}
            {r.heading&&<div style={{marginBottom:8}}><div style={{color:T.text,fontSize:15,fontWeight:700}}>{r.heading}</div></div>}
            {r.body&&<div style={{marginBottom:8}}><div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{r.body}</div></div>}
            {r.caption&&<div style={{marginBottom:8}}><div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{r.caption}</div></div>}
            {r.subject&&<div style={{marginBottom:8}}><Label c="Subject"/><div style={{color:T.text,fontWeight:700}}>{r.subject}</div></div>}
            {r.bullets?.length>0&&<ul style={{color:T.muted,fontSize:13,paddingLeft:18,margin:"8px 0"}}>{r.bullets.map((b,j)=><li key={j} style={{marginBottom:4}}>{b}</li>)}</ul>}
            {r.hashtags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>{r.hashtags.map(h=><Badge key={h} label={`#${h}`} color={T.dim} bg={`${T.dim}60`}/>)}</div>}
            {r.cta&&<div style={{marginTop:8}}><Badge label={r.cta} color={colors[i]} bg={`${colors[i]}15`}/></div>}
          </Card>)}
        </div>
      </div>}
      {!loading&&!results.length&&!error&&<Empty icon="🎨" title="Creative Studio Ready" sub="Configure your product and format, then generate"/>}
    </div>}
    {tab==="saved"&&(!saved.length
      ?<Empty icon="💾" title="No saved creatives yet" sub="Generate content and click Save"/>
      :<div style={{display:"flex",flexDirection:"column",gap:11}}>{saved.map((r,i)=><Card key={i}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{color:T.text,fontWeight:700}}>{r.title}</div><Badge label={r.fmt} color={T.purple} bg={`${T.purple}18`}/></div><div style={{color:T.muted,fontSize:12}}>{r.savedAt}</div></Card>)}</div>
    )}
  </div>;
}

// ─── AD LAUNCH ────────────────────────────────────────────────────────────────
function AdLaunch({initial,onComplete}){
  const [tab,setTab]=useState("build");
  const [prod,setProd]=useState(initial?.name||"SpinSpice 360° Rotating Spice Rack");
  const [price,setPrice]=useState(initial?.sellPrice||39);
  const [bgt,setBgt]=useState(500);
  const [plat,setPlat]=useState(PLATS[0]);
  const [obj,setObj]=useState(OBJS[0]);
  const [aud,setAud]=useState("US homemakers 28–45, interested in home organization");
  const [loading,setLoading]=useState(false);
  const [camp,setCamp]=useState(null);
  const [error,setError]=useState("");
  const [launching,setLaunching]=useState(false);
  const [launchResult,setLaunchResult]=useState(null);
  const [showJson,setShowJson]=useState(false);
  const [linking,setLinking]=useState(false);
  const [live,setLive]=useState({metaCampaigns:[],ttCampaigns:[],source:"",loading:true});

  useEffect(()=>{
    if(tab!=="live")return;
    let cancelled=false;
    setLive(l=>({...l,loading:true}));
    Promise.all([api("/api/meta"),api("/api/tiktok")]).then(([m,t])=>{
      if(cancelled)return;
      setLive({metaCampaigns:m.campaigns??[],ttCampaigns:t.campaigns??[],source:`${m.source??""} · ${t.source??""}`,loading:false});
    }).catch(()=>!cancelled&&setLive(l=>({...l,loading:false})));
    return()=>{cancelled=true;};
  },[tab]);

  const linkDone=async()=>{
    if(!onComplete||!camp)return;
    setLinking(true);
    try{await onComplete({campaign:camp,launchResult});}
    finally{setLinking(false);}
  };

  const gen=async()=>{
    setLoading(true);setError("");setCamp(null);setLaunchResult(null);
    const schema=`{"campaignName":"","objective":"","totalBudget":${bgt},"budgetSplit":{"meta":0,"tiktok":0},"duration":"","meta":{"adSetName":"","targeting":{"age":"","gender":"","interests":[],"behaviors":[],"locations":[]},"placements":[],"bidStrategy":"","dailyBudget":0,"adCopies":[{"headline":"","primaryText":"","description":"","cta":""},{"headline":"","primaryText":"","description":"","cta":""},{"headline":"","primaryText":"","description":"","cta":""}]},"tiktok":{"adGroupName":"","targeting":{"age":"","gender":"","interests":[],"deviceOS":""},"placements":[],"bidStrategy":"","dailyBudget":0,"adCopies":[{"hook":"","script":"","cta":"","hashtags":[]},{"hook":"","script":"","cta":"","hashtags":[]},{"hook":"","script":"","cta":"","hashtags":[]}]},"kpiTargets":{"targetRoas":0,"targetCtr":"","targetCpa":0,"breakEvenRoas":0},"testingStrategy":"","scalingRule":""}`;
    try{
      const raw=await ai(`Performance marketing expert, US dropshipping 2026. Product: ${prod} $${price}, platform: ${plat}, objective: ${obj}, budget: $${bgt}/mo, audience: ${aud}. Return ONLY raw JSON. Schema: ${schema}`);
      setCamp(parseAIJson(raw));
    }catch(e){setError("Error: "+e.message);}
    setLoading(false);
  };

  const launch=async()=>{
    if(!camp)return;
    setLaunching(true);
    try{
      const results={};
      if(plat!=="TikTok Only"){const d=await api("/api/meta",{campaign:camp});results.meta=d;}
      if(plat!=="Meta Only"){const d=await api("/api/tiktok",{campaign:camp});results.tiktok=d;}
      setLaunchResult(results);
    }catch(e){setError("Launch error: "+e.message);}
    setLaunching(false);
  };

  const isMeta=plat!=="TikTok Only",isTT=plat!=="Meta Only";
  return <div>
    <PHdr title="Ad Launch Agent" sub="Generate and deploy Meta + TikTok campaigns"/>
    <TabBar tabs={[{id:"build",l:"🛠 Build Campaign"},{id:"live",l:"📊 Live Campaigns"}]} active={tab} set={setTab}/>
    {tab==="live"&&<div>
      {live.source&&<SourceBadge source={live.source}/>}
      <Card>
        {live.loading?<Empty icon="📊" title="Loading live campaigns…" spin/>:(()=>{
          const rows=[
            ...live.metaCampaigns.map(c=>({n:c.name,pl:"Meta",st:(c.status||"").toLowerCase(),spend:c.spend?`$${c.spend}`:"—",roas:c.roas?`${c.roas}×`:"—",ctr:c.ctr??"—"})),
            ...live.ttCampaigns.map(c=>({n:c.campaign_name,pl:"TikTok",st:(c.operation_status||"").toLowerCase(),spend:c.spend?`$${c.spend}`:"—",roas:c.roas?`${c.roas}×`:"—",ctr:c.ctr??"—"})),
          ];
          if(!rows.length)return <Empty icon="📊" title="No campaigns yet" sub="Build and launch a campaign above to see it here"/>;
          return <table><thead><tr>{["Campaign","Platform","Status","Spend","ROAS","CTR"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((c,i)=><tr key={i}>
            <td style={{color:T.text,fontWeight:600}}>{c.n}</td>
            <td><Badge label={c.pl} color={c.pl==="Meta"?"#1877F2":T.text} bg={c.pl==="Meta"?"#1877F218":"#ffffff10"}/></td>
            <td><Pill st={c.st}/></td>
            <td style={{color:T.muted}}>{c.spend}</td>
            <td style={{color:parseFloat(c.roas)>=2.5?T.teal:T.rose,fontWeight:700}}>{c.roas}</td>
            <td style={{color:T.muted}}>{c.ctr}</td>
          </tr>)}</tbody></table>;
        })()}
      </Card>
    </div>}
    {tab==="build"&&<div>
      <Card style={{marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:14}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Product Name" value={prod} onChange={setProd}/></div>
          <Field label="Sell Price ($)" value={price} onChange={setPrice} type="number"/>
          <Field label="Monthly Budget ($)" value={bgt} onChange={setBgt} type="number"/>
          <Field label="Platform" value={plat} onChange={setPlat} opts={PLATS}/>
          <Field label="Objective" value={obj} onChange={setObj} opts={OBJS}/>
          <div style={{gridColumn:"1/-1"}}><Field label="Target Audience" value={aud} onChange={setAud}/></div>
        </div>
        <Btn label={loading?"⚙️ Generating…":"⚡ Generate Campaign"} onClick={gen} disabled={loading} color={T.orange}/>
      </Card>
      {loading&&<Empty icon="📢" title="Ad Launch Agent Working…" sub="Claude is building your full campaign config" spin/>}
      {error&&<Card style={{borderColor:"rgba(244,63,94,.3)",marginBottom:14}}><span style={{color:T.rose,fontWeight:700}}>⚠️ {error}</span></Card>}
      {camp&&<div>
        <div style={{background:"rgba(255,107,53,.1)",border:"1px solid rgba(255,107,53,.28)",borderRadius:16,padding:"18px 22px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
          <div><div style={{color:T.text,fontWeight:800,fontSize:17,marginBottom:3}}>{camp.campaignName}</div><div style={{color:T.muted,fontSize:13}}>{camp.objective} · {camp.duration}</div></div>
          <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
            {[["Budget",`$${camp.totalBudget}`,T.orange],["Target ROAS",`${camp.kpiTargets?.targetRoas}×`,T.teal],["Target CPA",`$${camp.kpiTargets?.targetCpa}`,T.amber]].map(([l,v,c])=><div key={l}><Label c={l}/><div style={{color:c,fontSize:18,fontWeight:800}}>{v}</div></div>)}
          </div>
        </div>
        {isMeta&&camp.meta&&<Card style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{width:26,height:26,borderRadius:6,background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>f</div><div style={{color:T.text,fontWeight:700}}>Meta Campaign</div><Badge label={`$${camp.meta.dailyBudget}/day`} color={T.amber} bg="rgba(245,166,35,.12)"/></div>
          <div style={{marginBottom:10}}><Label c="Audience"/><div style={{color:T.muted,fontSize:13}}>Age: {camp.meta.targeting?.age} · {camp.meta.targeting?.gender} · Locations: {camp.meta.targeting?.locations?.join(", ")}</div></div>
          <Label c="Ad Copy Variants"/>
          {camp.meta.adCopies?.map((ad,i)=><div key={i} style={{background:T.s2,borderRadius:9,padding:"10px 13px",marginBottom:8,borderLeft:`3px solid ${[T.primary,T.teal,T.orange][i]}`}}>
            <div style={{color:T.text,fontWeight:700,fontSize:13,marginBottom:3}}>Variant {i+1} — {ad.headline}</div>
            <div style={{color:T.muted,fontSize:12,marginBottom:5}}>{ad.primaryText}</div>
            <Badge label={ad.cta} color={T.primary} bg={`${T.primary}18`}/>
          </div>)}
        </Card>}
        {isTT&&camp.tiktok&&<Card style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{width:26,height:26,borderRadius:6,background:"#111",border:"1px solid #333",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🎵</div><div style={{color:T.text,fontWeight:700}}>TikTok Campaign</div><Badge label={`$${camp.tiktok.dailyBudget}/day`} color={T.rose} bg="rgba(244,63,94,.12)"/></div>
          <Label c="Video Ad Scripts"/>
          {camp.tiktok.adCopies?.map((ad,i)=><div key={i} style={{background:T.s2,borderRadius:9,padding:"10px 13px",marginBottom:8,borderLeft:`3px solid ${[T.rose,T.purple,T.amber][i]}`}}>
            <div style={{color:T.orange,fontSize:12,fontStyle:"italic",marginBottom:3}}>Hook: "{ad.hook}"</div>
            <div style={{color:T.muted,fontSize:12,marginBottom:5}}>{ad.script}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}><Badge label={ad.cta} color={T.rose} bg="rgba(244,63,94,.12)"/>{ad.hashtags?.slice(0,4).map(h=><Badge key={h} label={`#${h}`} color={T.dim} bg={`${T.dim}60`}/>)}</div>
          </div>)}
        </Card>}
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><Label c="Testing Strategy"/><div style={{color:T.muted,fontSize:13}}>{camp.testingStrategy}</div></div>
            <Btn label={showJson?"Hide JSON":"View JSON"} small ghost onClick={()=>setShowJson(v=>!v)}/>
          </div>
          {showJson&&<pre style={{background:T.bg,borderRadius:8,padding:12,fontSize:11,color:T.teal,overflowX:"auto",maxHeight:220,whiteSpace:"pre-wrap",marginTop:12,border:`1px solid ${T.dim}`}}>{JSON.stringify(camp,null,2)}</pre>}
        </Card>
        {/* Launch Result */}
        {launchResult&&<div style={{marginBottom:14}}>
          {launchResult.meta&&<div style={{background:`${T.teal}0f`,border:`1px solid ${T.teal}30`,borderRadius:10,padding:"12px 16px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><Dot color={T.teal} anim/><span style={{color:T.teal,fontWeight:700}}>Meta: {launchResult.meta.source}</span></div>
            <div style={{color:T.muted,fontSize:13}}>{launchResult.meta.result?.message??JSON.stringify(launchResult.meta.result)}</div>
          </div>}
          {launchResult.tiktok&&<div style={{background:`${T.primary}0f`,border:`1px solid ${T.primary}30`,borderRadius:10,padding:"12px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><Dot color={T.primary} anim/><span style={{color:T.primary,fontWeight:700}}>TikTok: {launchResult.tiktok.source}</span></div>
            <div style={{color:T.muted,fontSize:13}}>{launchResult.tiktok.result?.message??JSON.stringify(launchResult.tiktok.result)}</div>
          </div>}
        </div>}
        {!launchResult&&<div style={{background:`${T.primary}0e`,border:`1px solid ${T.primary}25`,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div><div style={{color:T.text,fontWeight:700}}>Ready to Launch</div><div style={{color:T.muted,fontSize:12,marginTop:2}}>Will push to Meta + TikTok APIs (or simulate if keys not set)</div></div>
          <Btn label={launching?"🚀 Launching…":"🚀 Launch Campaign"} onClick={launch} disabled={launching}/>
        </div>}
        {onComplete&&<div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
          <Btn label={linking?"Linking…":"✓ Mark Ad Launch Done & Return to Pipeline"} color={T.orange} disabled={linking} onClick={linkDone}/>
        </div>}
      </div>}
      {!loading&&!camp&&!error&&<Empty icon="📢" title="Ad Launch Agent Ready" sub="Fill in product details and generate your campaign"/>}
    </div>}
  </div>;
}

// ─── STORE MANAGER ────────────────────────────────────────────────────────────
function StoreManager({initial,onComplete}){
  const [products,setProducts]=useState([]);
  const [source,setSource]=useState("");
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState(initial?"new":"list");
  const [newProd,setNewProd]=useState({name:initial?.name||"",description:"",price:initial?.sellPrice?String(initial.sellPrice):"",comparePrice:""});
  const [listing,setListing]=useState(false);
  const [listResult,setListResult]=useState(null);
  const [linking,setLinking]=useState(false);

  const linkDone=async()=>{
    if(!onComplete||!listResult||listResult.error)return;
    setLinking(true);
    try{await onComplete(listResult);}
    finally{setLinking(false);}
  };

  useEffect(()=>{
    api("/api/shopify").then(d=>{setProducts(d.products??[]);setSource(d.source??"");setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const listProduct=async()=>{
    if(!newProd.name||!newProd.price)return;
    setListing(true);
    try{
      const d=await api("/api/shopify",{...newProd,price:parseFloat(newProd.price),comparePrice:parseFloat(newProd.comparePrice||0)});
      setListResult(d);
      if(d.product)setProducts(p=>[{id:d.product.id,name:d.product.name||newProd.name,sku:"NEW",vars:1,price:parseFloat(newProd.price),stock:100,status:"active"},...p]);
    }catch(e){setListResult({error:e.message});}
    setListing(false);
  };

  return <div>
    <PHdr title="Store Manager" sub={initial?`Listing pipeline item: ${initial.name}`:"Shopify product listings, inventory and pricing"}/>
    {source&&<SourceBadge source={source}/>}
    <TabBar tabs={[{id:"list",l:"📦 Products"},{id:"new",l:"➕ List New Product"}]} active={tab} set={setTab}/>
    {tab==="list"&&(loading?<Empty icon="🛍️" title="Loading products…" spin/>:<Card>
      <table><thead><tr>{["Product","SKU","Variants","Price","Stock","Status"].map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{products.map((p,i)=><tr key={i}>
        <td style={{color:T.text,fontWeight:600}}>{p.name}</td>
        <td style={{color:T.muted,fontFamily:"monospace",fontSize:12}}>{p.sku}</td>
        <td style={{color:T.muted}}>{p.vars}</td>
        <td style={{color:T.teal,fontWeight:700}}>${p.price}</td>
        <td style={{color:p.stock<50?T.rose:T.muted,fontWeight:p.stock<50?700:400}}>{p.stock}</td>
        <td><Pill st={p.status}/></td>
      </tr>)}</tbody></table>
    </Card>)}
    {tab==="new"&&<div>
      <Card style={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:14}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Product Title" value={newProd.name} onChange={v=>setNewProd(p=>({...p,name:v}))} placeholder="SpinSpice 360° Rotating Spice Rack"/></div>
          <Field label="Sell Price ($)" value={newProd.price} onChange={v=>setNewProd(p=>({...p,price:v}))} type="number"/>
          <Field label="Compare-at Price ($)" value={newProd.comparePrice} onChange={v=>setNewProd(p=>({...p,comparePrice:v}))} type="number"/>
          <div style={{gridColumn:"1/-1"}}><Label c="Product Description"/><textarea value={newProd.description} onChange={e=>setNewProd(p=>({...p,description:e.target.value}))} rows={3} placeholder="Describe the product..." style={{width:"100%",background:T.s2,border:`1px solid ${T.dim}`,color:T.text,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",resize:"vertical"}}/></div>
        </div>
        <Btn label={listing?"Listing on Shopify…":"🛍️ List on Shopify"} onClick={listProduct} disabled={listing||!newProd.name||!newProd.price} color={T.teal}/>
      </Card>
      {listResult&&<Card style={{borderColor:listResult.error?`rgba(244,63,94,.3)`:`rgba(0,200,150,.3)`}}>
        {listResult.error?<div style={{color:T.rose,fontWeight:700}}>⚠️ {listResult.error}</div>:<div>
          <div style={{color:T.teal,fontWeight:700,marginBottom:6}}>✅ Product listed successfully!</div>
          <div style={{color:T.muted,fontSize:13}}>Source: {listResult.source}</div>
          <div style={{color:T.muted,fontSize:13}}>ID: {listResult.product?.id}</div>
          {onComplete&&<div style={{marginTop:12}}><Btn label={linking?"Linking…":"✓ Mark Store Done & Return to Pipeline"} color={T.teal} disabled={linking} onClick={linkDone}/></div>}
        </div>}
      </Card>}
    </div>}
  </div>;
}

// ─── FULFILLMENT ──────────────────────────────────────────────────────────────
function Fulfillment({initial,onComplete}){
  const [orders,setOrders]=useState([]);
  const [stats,setStats]=useState({});
  const [source,setSource]=useState("");
  const [loading,setLoading]=useState(true);
  const [linking,setLinking]=useState(false);
  useEffect(()=>{api("/api/fulfillment").then(d=>{setOrders(d.orders??[]);setStats(d.stats??{});setSource(d.source??"");setLoading(false);}).catch(()=>setLoading(false));},[]);

  const linkDone=async()=>{
    if(!onComplete)return;
    setLinking(true);
    try{await onComplete({stats,source});}
    finally{setLinking(false);}
  };

  if(loading)return <Empty icon="📦" title="Loading orders…" spin/>;
  return <div>
    <PHdr title="Fulfillment" sub={initial?`Routing pipeline item: ${initial.name}`:"Order routing, 3PL management and last-mile tracking"} action={onComplete&&<Btn label={linking?"Linking…":"✓ Mark Fulfillment Done"} small onClick={linkDone} disabled={linking}/>}/>
    {source&&<SourceBadge source={source}/>}
    <KPIs items={[{l:"Orders Today",v:stats.today??47,c:T.primary},{l:"In Transit",v:stats.transit??23,c:T.amber},{l:"Delivered Today",v:stats.delivered??19,c:T.teal},{l:"On-Time Rate",v:stats.onTime??"98.2%",c:T.teal}]}/>
    <Card>
      <table><thead><tr>{["Order","Product","Customer","3PL","ETA","Status"].map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{orders.map((o,i)=><tr key={i}>
        <td style={{color:T.primary,fontWeight:700,fontFamily:"monospace"}}>{o.id}</td>
        <td style={{color:T.text}}>{o.prod}</td>
        <td style={{color:T.muted}}>{o.cust}</td>
        <td style={{color:T.muted,fontSize:12}}>{o.pl}</td>
        <td style={{color:T.muted}}>{o.eta}</td>
        <td><Pill st={o.status}/></td>
      </tr>)}</tbody></table>
    </Card>
  </div>;
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics(){
  const [data,setData]=useState(null);const [tab,setTab]=useState("perf");
  const [products,setProducts]=useState([]);const [prodSource,setProdSource]=useState("");
  const [err,setErr]=useState("");
  useEffect(()=>{api("/api/analytics").then(d=>d.error?setErr(d.error):setData(d)).catch(e=>setErr(e.message));},[]);
  useEffect(()=>{api("/api/shopify").then(d=>{setProducts(d.products??[]);setProdSource(d.source??"");}).catch(()=>{});},[]);

  if(err)return <div><PHdr title="Analytics" sub="ROAS, CAC and campaign performance"/><Card><span style={{color:T.rose,fontWeight:700}}>⚠️ {err}</span></Card></div>;
  if(!data)return <Empty icon="📊" title="Loading analytics…" sub="Pulling live Meta + TikTok performance data" spin/>;

  const daily=data.daily??[];
  const s=data.summary;
  const totalPrice=products.reduce((sum,p)=>sum+(p.price||0),0)||1;
  const PRODS=products.map(p=>({
    n:p.name,
    rev:Math.round((s.totalRevenue??0)*((p.price||0)/totalPrice)),
    orders:Math.round((s.totalOrders??0)*((p.price||0)/totalPrice)),
    roas:s.avgRoas??0,
    cac:s.avgCac??0,
  }));
  return <div>
    <PHdr title="Analytics" sub="ROAS, CAC and campaign performance"/>
    {data?.source&&<SourceBadge source={data.source}/>}
    <KPIs items={[{l:"Revenue MTD",v:`$${s.totalRevenue?.toLocaleString()}`,sub:"+18% MoM",c:T.teal},{l:"Ad Spend MTD",v:`$${s.totalSpend?.toLocaleString()}`,c:T.orange},{l:"Avg ROAS",v:`${s.avgRoas}×`,sub:"target 2.5×",c:T.primary},{l:"Total Orders",v:s.totalOrders,sub:"+23% MoM",c:T.purple},{l:"Avg CAC",v:`$${s.avgCac}`,c:T.cyan}]}/>
    <TabBar tabs={[{id:"perf",l:"📈 Performance"},{id:"prods",l:"📦 By Product"}]} active={tab} set={setTab}/>
    {tab==="perf"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
      <Card><Label c="ROAS by Platform (7d)"/><ResponsiveContainer width="100%" height={200}><LineChart data={daily} margin={{top:8,right:8,bottom:0,left:-20}}><CartesianGrid strokeDasharray="3 3" stroke={T.dim}/><XAxis dataKey="d" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip content={<TipBox/>}/><Line type="monotone" dataKey="meta" stroke="#1877F2" strokeWidth={2} dot={false} name="Meta"/><Line type="monotone" dataKey="tt" stroke={T.rose} strokeWidth={2} dot={false} name="TikTok"/></LineChart></ResponsiveContainer></Card>
      <Card><Label c="Revenue vs Ad Spend (7d)"/><ResponsiveContainer width="100%" height={200}><BarChart data={daily} margin={{top:8,right:8,bottom:0,left:-20}}><CartesianGrid strokeDasharray="3 3" stroke={T.dim}/><XAxis dataKey="d" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip content={<TipBox/>}/><Bar dataKey="rev" fill={T.teal} radius={[4,4,0,0]} name="Revenue"/><Bar dataKey="spend" fill={T.orange} radius={[4,4,0,0]} name="Spend"/></BarChart></ResponsiveContainer></Card>
    </div>}
    {tab==="prods"&&<Card>
      {prodSource&&<div style={{marginBottom:12}}><SourceBadge source={prodSource}/></div>}
      {!PRODS.length?<Empty icon="📦" title="No products yet" sub="List products in Store Manager to see per-product performance here"/>:<table><thead><tr>{["Product","Est. Revenue","Est. Orders","ROAS","CAC","Status"].map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{PRODS.map((p,i)=><tr key={i}><td style={{color:T.text,fontWeight:600}}>{p.n}</td><td style={{color:T.teal,fontWeight:700}}>${p.rev.toLocaleString()}</td><td style={{color:T.muted}}>{p.orders}</td><td style={{color:p.roas>=2.5?T.teal:p.roas>=2?T.amber:T.rose,fontWeight:700}}>{p.roas}×</td><td style={{color:T.muted}}>${p.cac}</td><td><Badge label={p.roas>=2?"Scaling":"Review"} color={p.roas>=2?T.teal:T.amber} bg={p.roas>=2?"rgba(0,200,150,.1)":"rgba(245,166,35,.1)"}/></td></tr>)}
      </tbody></table>}
    </Card>}
  </div>;
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────
function Finance({goal}){
  const [data,setData]=useState(null);
  const [items,setItems]=useState([]);
  const [err,setErr]=useState("");
  useEffect(()=>{api("/api/analytics").then(d=>d.error?setErr(d.error):setData(d)).catch(e=>setErr(e.message));},[]);
  useEffect(()=>{api("/api/pipeline").then(d=>setItems(d.items??[])).catch(()=>{});},[]);

  if(err)return <div><PHdr title="Finance" sub="P&L tracking, budget pacing and margin analysis"/><Card><span style={{color:T.rose,fontWeight:700}}>⚠️ {err}</span></Card></div>;
  if(!data)return <Empty icon="💰" title="Loading finance data…" sub="Pulling live analytics and pipeline margins" spin/>;

  const daily=data.daily??[];
  const marginPcts=items.map(i=>i.margin).filter(m=>typeof m==="number"&&m>0);
  const cogsRatio=marginPcts.length?1-(marginPcts.reduce((a,b)=>a+b,0)/marginPcts.length/100):0.45;
  const PLW=daily.map(d=>{
    const rev=d.rev??0,ads=d.spend??0,cogs=Math.round(rev*cogsRatio),net=Math.round(rev-cogs-ads);
    return {w:d.d,rev,cogs,ads,net};
  });

  const totRev=PLW.reduce((s,r)=>s+r.rev,0),totNet=PLW.reduce((s,r)=>s+r.net,0),totAds=PLW.reduce((s,r)=>s+r.ads,0),totCogs=PLW.reduce((s,r)=>s+r.cogs,0);
  const margin=totRev?Math.round((totNet/totRev)*100):0;
  const metaSpend=data?.meta?.spend??Math.round(totAds*0.55);
  const ttSpend=data?.tiktok?.spend??Math.round(totAds*0.45);
  const EXP=[
    {cat:"Ad Spend – Meta",amt:Math.round(metaSpend),bgt:Math.round(metaSpend*1.2)||1},
    {cat:"Ad Spend – TikTok",amt:Math.round(ttSpend),bgt:Math.round(ttSpend*1.2)||1},
    {cat:"Est. COGS (from pipeline margins)",amt:totCogs,bgt:Math.round(totCogs*1.1)||1},
  ];
  const goalAmt=goal||10000;
  return <div>
    <PHdr title="Finance" sub="P&L tracking, budget pacing and margin analysis — derived from live Analytics + Pipeline data"/>
    {data?.source&&<SourceBadge source={data.source}/>}
    <KPIs items={[{l:"Revenue (7d)",v:`$${totRev.toLocaleString()}`,c:T.teal},{l:"Est. COGS (7d)",v:`$${totCogs.toLocaleString()}`,c:T.orange},{l:"Ad Spend (7d)",v:`$${totAds.toLocaleString()}`,c:T.amber},{l:"Net Profit (7d)",v:`$${totNet.toLocaleString()}`,c:T.teal},{l:"Net Margin",v:`${margin}%`,c:margin>=35?T.teal:T.rose}]}/>
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Label c={`Revenue vs Monthly Goal ($${goalAmt.toLocaleString()})`}/><span style={{color:T.teal,fontSize:12,fontWeight:700}}>{Math.round((totRev/goalAmt)*100)}% complete</span></div>
      <div style={{height:8,background:T.dim,borderRadius:6,overflow:"hidden",marginBottom:5}}><div style={{height:"100%",width:`${Math.min((totRev/goalAmt)*100,100)}%`,background:`linear-gradient(90deg,${T.primary},${T.teal})`,borderRadius:6}}/></div>
      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.muted,fontSize:11}}>${totRev.toLocaleString()} earned</span><span style={{color:T.muted,fontSize:11}}>${Math.max(goalAmt-totRev,0).toLocaleString()} remaining</span></div>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:16}}>
      <Card><Label c="Daily P&L (7d, live)"/><ResponsiveContainer width="100%" height={200}><AreaChart data={PLW} margin={{top:8,right:8,bottom:0,left:-20}}><defs><linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.teal} stopOpacity={.3}/><stop offset="95%" stopColor={T.teal} stopOpacity={0}/></linearGradient><linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.primary} stopOpacity={.3}/><stop offset="95%" stopColor={T.primary} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={T.dim}/><XAxis dataKey="w" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip content={<TipBox/>}/><Area type="monotone" dataKey="rev" stroke={T.teal} fill="url(#gR)" strokeWidth={2} name="Revenue"/><Area type="monotone" dataKey="net" stroke={T.primary} fill="url(#gN)" strokeWidth={2} name="Net Profit"/></AreaChart></ResponsiveContainer></Card>
      <Card><Label c="Budget Pacing (7d)"/><div style={{display:"flex",flexDirection:"column",gap:11,marginTop:4}}>{EXP.map(e=>{const pct=Math.round((e.amt/e.bgt)*100);return <div key={e.cat}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:T.text,fontSize:12}}>{e.cat}</span><span style={{color:pct>90?T.rose:T.muted,fontSize:12,fontWeight:700}}>${e.amt}/${e.bgt}</span></div><div style={{height:4,background:T.dim,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>90?T.rose:pct>75?T.amber:T.teal,borderRadius:3}}/></div></div>;})}  </div></Card>
    </div>
    <Card><Label c="P&L Breakdown"/><table><thead><tr>{["Day","Revenue","Est. COGS","Ad Spend","Net","Margin"].map(h=><th key={h} style={{textAlign:"right"}}>{h}</th>)}</tr></thead>
      <tbody>{PLW.map(r=>{const m=r.rev?Math.round((r.net/r.rev)*100):0;return <tr key={r.w}>{[r.w,`$${r.rev}`,`$${r.cogs}`,`$${r.ads}`,`$${r.net}`,`${m}%`].map((v,i)=><td key={i} style={{textAlign:"right",color:i===0?T.text:i===4?T.teal:i===5?(m>=30?T.teal:T.rose):T.muted,fontWeight:i===0?600:400}}>{v}</td>)}</tr>;})}
      <tr style={{background:T.s2}}>{[["Total",T.text],[`$${totRev}`,T.text],[`$${totCogs}`,T.muted],[`$${totAds}`,T.muted],[`$${totNet}`,T.teal],[`${margin}%`,margin>=30?T.teal:T.rose]].map(([v,c],i)=><td key={i} style={{textAlign:"right",color:c,fontWeight:700}}>{v}</td>)}</tr>
      </tbody></table></Card>
  </div>;
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings(){
  const KEYS=[
    {k:"ANTHROPIC_API_KEY",l:"Anthropic API Key",hint:"sk-ant-xxxx",st:"required",docs:"console.anthropic.com"},
    {k:"META_ACCESS_TOKEN",l:"Meta Access Token",hint:"EAAxxxxxxx",st:"meta",docs:"developers.facebook.com"},
    {k:"META_AD_ACCOUNT_ID",l:"Meta Ad Account ID",hint:"act_123456789",st:"meta",docs:"business.facebook.com"},
    {k:"TIKTOK_ACCESS_TOKEN",l:"TikTok Access Token",hint:"xxxxxxxxxx",st:"tiktok",docs:"ads.tiktok.com/marketing_api"},
    {k:"TIKTOK_ADVERTISER_ID",l:"TikTok Advertiser ID",hint:"1234567890",st:"tiktok",docs:"ads.tiktok.com"},
    {k:"SHOPIFY_ACCESS_TOKEN",l:"Shopify Access Token",hint:"shpat_xxxxx",st:"shopify",docs:"shopify.dev"},
    {k:"SHOPIFY_STORE_DOMAIN",l:"Shopify Store Domain",hint:"your-store.myshopify.com",st:"shopify",docs:"shopify.dev"},
    {k:"CJ_API_KEY",l:"CJ Dropshipping API Key",hint:"xxxxxxxxxx",st:"cj",docs:"cjdropshipping.com"},
    {k:"CJ_EMAIL",l:"CJ Dropshipping Email",hint:"your@email.com",st:"cj",docs:"cjdropshipping.com"},
    {k:"SHIPBOB_TOKEN",l:"ShipBob API Token",hint:"xxxxxxxxxx",st:"shipbob",docs:"developer.shipbob.com"},
  ];
  const groups={required:{label:"Required",color:T.rose},meta:{label:"Meta Ads",color:"#1877F2"},tiktok:{label:"TikTok Ads",color:T.rose},shopify:{label:"Shopify",color:T.teal},cj:{label:"CJ Dropshipping",color:T.amber},shipbob:{label:"ShipBob",color:T.cyan}};
  const [show,setShow]=useState({});
  return <div>
    <PHdr title="Settings" sub="API keys and integrations — edit these in your .env.local file"/>
    <div style={{background:`${T.amber}0f`,border:`1px solid ${T.amber}30`,borderRadius:12,padding:"14px 18px",marginBottom:20}}>
      <div style={{color:T.amber,fontWeight:700,fontSize:13,marginBottom:4}}>⚠️ How to set API keys</div>
      <div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>
        Open <code style={{background:T.s2,padding:"1px 6px",borderRadius:4,color:T.teal}}>.env.local</code> in your project root and add your keys there. Never paste real keys into this UI — it's for reference only. After editing <code style={{background:T.s2,padding:"1px 6px",borderRadius:4,color:T.teal}}>.env.local</code>, restart the dev server or redeploy to Vercel.
      </div>
    </div>
    {Object.entries(groups).map(([gKey,g])=><Card key={gKey} style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <Badge label={g.label} color={g.color} bg={`${g.color}18`}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {KEYS.filter(f=>f.st===gKey).map(f=><div key={f.k}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <Label c={f.l}/>
            <a href={`https://${f.docs}`} target="_blank" rel="noopener noreferrer" style={{color:T.primary,fontSize:11,textDecoration:"none"}}>docs →</a>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <code style={{flex:1,background:T.s2,border:`1px solid ${T.dim}`,color:T.teal,borderRadius:8,padding:"8px 12px",fontSize:12,display:"block"}}>{show[f.k]?`process.env.${f.k}`:f.hint}</code>
            <button onClick={()=>setShow(s=>({...s,[f.k]:!s[f.k]}))} style={{background:"none",border:`1px solid ${T.dim}`,color:T.muted,borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>{show[f.k]?"Hide":"Info"}</button>
          </div>
        </div>)}
      </div>
    </Card>)}
    <Card>
      <div style={{color:T.text,fontWeight:700,fontSize:15,marginBottom:14}}>Agent Schedules</div>
      {[{ag:"Product Scout",s:"Every 6 hours",n:"in 2h 14m"},{ag:"Supplier Connect",s:"On demand",n:"—"},{ag:"Creative Studio",s:"On demand",n:"—"},{ag:"Ad Launch",s:"Real-time",n:"Always on"},{ag:"Analytics",s:"Every hour",n:"in 42m"},{ag:"Finance",s:"Daily at midnight",n:"in 6h"}].map(r=><div key={r.ag} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:10,marginBottom:10,borderBottom:`1px solid ${T.border}`}}>
        <div style={{color:T.text,fontWeight:600,fontSize:13}}>{r.ag}</div>
        <div style={{display:"flex",gap:20}}><div><Label c="Schedule"/><div style={{color:T.muted,fontSize:12}}>{r.s}</div></div><div><Label c="Next Run"/><div style={{color:T.primary,fontSize:12,fontWeight:600}}>{r.n}</div></div></div>
      </div>)}
    </Card>
  </div>;
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
const SUGG=[
  {l:"🔍 Scout pet products",c:"Scout for winning pet products with a $500 budget"},
  {l:"📊 Check my ROAS",c:"What's my current ROAS and how are campaigns performing?"},
  {l:"📢 Launch SpinSpice ad",c:"Launch a Meta + TikTok campaign for SpinSpice at $39"},
  {l:"🔄 View pipeline",c:"Show me my pipeline status"},
  {l:"💰 Margin check",c:"What's my current net margin and P&L this month?"},
  {l:"🎨 Write TikTok script",c:"Generate a viral TikTok UGC script for the SpinSpice rack"},
];
const NAVMAP={overview:"overview",scout:"scout",supplier:"supplier",creative:"creative",adlaunch:"adlaunch",store:"store",fulfillment:"fulfillment",analytics:"analytics",finance:"finance",settings:"settings",pipeline:"pipeline"};

function ChatBot({setPage,goal,agents}){
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"ai",text:"Hey! I'm your FLUXE command assistant. Tell me what to do — I can search products, launch campaigns, check analytics, navigate the app, or answer any questions.",ts:"now"}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [unread,setUnread]=useState(0);
  const active=agents.filter(a=>a.on).length;

  const SYSTEM=`You are FLUXE AI, command assistant for the FLUXE autonomous e-commerce OS.
Pages: overview, pipeline (product tracking), scout (product research), supplier, creative (ad copy), adlaunch (Meta+TikTok campaigns), store (Shopify), fulfillment (ShipBob orders), analytics (ROAS/CAC), finance (P&L), settings.
App state: Goal $${goal.toLocaleString()}, ${active}/8 agents active, ROAS 2.4×, Net MTD $3820, Orders today 47.
All backend APIs are wired: /api/supplier (CJ Dropshipping), /api/shopify (Shopify), /api/meta + /api/tiktok (Ad APIs), /api/analytics, /api/fulfillment (ShipBob), /api/pipeline.
Respond ONLY with valid JSON: {"message":"friendly 1-3 sentence response","action":"navigate|info|none","page":"page_id if navigating","badge":"short action label","tip":"optional pro tip"}`;

  const send=async(text)=>{
    if(!text.trim()||loading)return;
    setMsgs(m=>[...m,{role:"user",text,ts:new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}]);
    setInput("");setLoading(true);
    try{
      const history=msgs.slice(-6).map(m=>m.role==="ai"?`assistant: ${m.text}`:`user: ${m.text}`).join("\n");
      const raw=await ai(`${SYSTEM}\n\nHistory:\n${history}\n\nUser: ${text}`);
      let parsed;try{parsed=JSON.parse(raw);}catch{parsed={message:raw,action:"none"};}
      const aiMsg={role:"ai",text:parsed.message||"Got it.",action:parsed.action,page:parsed.page,badge:parsed.badge,tip:parsed.tip,ts:new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})};
      setMsgs(m=>[...m,aiMsg]);
      if(parsed.action==="navigate"&&parsed.page&&NAVMAP[parsed.page])setTimeout(()=>setPage(NAVMAP[parsed.page]),600);
      if(!open)setUnread(u=>u+1);
    }catch(e){setMsgs(m=>[...m,{role:"ai",text:"Something went wrong. Try again.",ts:"—"}]);}
    setLoading(false);
  };

  return <>
    {!open&&<button onClick={()=>{setOpen(true);setUnread(0);}} style={{position:"fixed",bottom:24,right:24,zIndex:999,width:54,height:54,borderRadius:"50%",border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.primary},${T.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 4px 24px ${T.primary}66`}}>
      💬{unread>0&&<div style={{position:"absolute",top:0,right:0,width:18,height:18,borderRadius:"50%",background:T.rose,border:`2px solid ${T.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{unread}</div>}
    </button>}
    {open&&<div style={{position:"fixed",bottom:24,right:24,zIndex:999,width:380,height:560,borderRadius:18,background:T.s1,border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.6)",overflow:"hidden"}}>
      <div style={{background:`linear-gradient(135deg,${T.primary},${T.cyan})`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
          <div><div style={{color:"#fff",fontWeight:800,fontSize:14}}>FLUXE AI</div><div style={{display:"flex",alignItems:"center",gap:5}}><Dot color="#fff" anim/><span style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:600}}>Command Assistant · All APIs Connected</span></div></div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:28,height:28,borderRadius:8,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=><div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:4}}>
          <div style={{maxWidth:"85%",padding:"9px 13px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?`linear-gradient(135deg,${T.primary},${T.cyan})`:T.s2,border:m.role==="ai"?`1px solid ${T.border}`:"none",color:T.text,fontSize:13,lineHeight:1.5}}>{m.text}</div>
          {m.action==="navigate"&&m.badge&&<div style={{display:"flex",alignItems:"center",gap:6,background:`${T.primary}15`,border:`1px solid ${T.primary}30`,borderRadius:20,padding:"3px 10px"}}><Dot color={T.primary} anim/><span style={{color:T.primary,fontSize:10,fontWeight:700}}>{m.badge}</span></div>}
          {m.tip&&<div style={{background:`${T.amber}10`,border:`1px solid ${T.amber}25`,borderRadius:8,padding:"6px 10px",maxWidth:"85%"}}><span style={{color:T.amber,fontSize:10,fontWeight:700}}>TIP  </span><span style={{color:T.muted,fontSize:11}}>{m.tip}</span></div>}
          <span style={{color:T.dim,fontSize:10}}>{m.ts}</span>
        </div>)}
        {loading&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:T.s2,borderRadius:"12px 12px 12px 4px",border:`1px solid ${T.border}`,width:"fit-content"}}>
          <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:T.primary,animation:`pulse 1.2s ${i*.2}s infinite`}}/>)}</div>
          <span style={{color:T.muted,fontSize:12}}>FLUXE AI thinking…</span>
        </div>}
      </div>
      {msgs.length<=1&&<div style={{padding:"0 14px 10px",display:"flex",flexWrap:"wrap",gap:6,flexShrink:0}}>
        {SUGG.map(s=><button key={s.c} onClick={()=>send(s.c)} style={{background:T.s2,border:`1px solid ${T.dim}`,color:T.muted,borderRadius:20,padding:"5px 11px",fontSize:11,cursor:"pointer",fontWeight:600}}>{s.l}</button>)}
      </div>}
      <div style={{padding:"10px 14px 14px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)} placeholder="Type a command or question…" disabled={loading} style={{flex:1,background:T.s2,border:`1px solid ${T.dim}`,color:T.text,borderRadius:10,padding:"9px 13px",fontSize:13,outline:"none"}}/>
          <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:38,height:38,borderRadius:10,border:"none",cursor:loading||!input.trim()?"not-allowed":"pointer",background:loading||!input.trim()?T.dim:`linear-gradient(135deg,${T.primary},${T.cyan})`,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",opacity:loading||!input.trim()?.5:1}}>➤</button>
        </div>
        <div style={{color:T.dim,fontSize:10,marginTop:6,textAlign:"center"}}>Enter to send · Powered by Claude AI</div>
      </div>
    </div>}
  </>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function FLUXE(){
  const {data:session}=useSession();
  const [page,setPage]=useState("overview");
  const [goal,setGoal]=useState(10000);
  const [agents,setAgents]=useState(AGENTS_DEF.map(a=>({...a,on:true})));
  const [launchProd,setLaunchProd]=useState(null);
  const [analytics,setAnalytics]=useState(null);
  const [activeItem,setActiveItem]=useState(null);

  useEffect(()=>{api("/api/analytics").then(d=>setAnalytics(d)).catch(()=>{});},[]);

  const goLaunch=useCallback(prod=>{setLaunchProd(prod);setPage("adlaunch");},[]);
  const goPipeline=useCallback(()=>setPage("pipeline"),[]);
  const openStage=useCallback(item=>{setActiveItem(item);setPage(item.currentStage);},[]);
  const completeStage=useCallback(async(stage,data)=>{
    if(!activeItem)return;
    const d=await api("/api/pipeline",{action:"update",id:activeItem.id,stage,status:"done",data});
    setActiveItem(d.item&&d.item.currentStage!=="complete"?d.item:null);
    setPage("pipeline");
  },[activeItem]);

  const PAGES={
    overview:<Overview goal={goal} setGoal={setGoal} agents={agents} analytics={analytics}/>,
    pipeline:<Pipeline onNavigate={setPage} onOpenStage={openStage}/>,
    scout:<Scout onLaunch={goLaunch} onAddPipeline={goPipeline}/>,
    supplier:<Supplier initial={activeItem} onComplete={data=>completeStage("supplier",data)}/>,
    creative:<Creative initial={activeItem} onComplete={data=>completeStage("creative",data)}/>,
    adlaunch:<AdLaunch initial={activeItem||launchProd} onComplete={activeItem?data=>completeStage("adlaunch",data):undefined}/>,
    store:<StoreManager initial={activeItem} onComplete={data=>completeStage("store",data)}/>,
    fulfillment:<Fulfillment initial={activeItem} onComplete={data=>completeStage("fulfillment",data)}/>,
    analytics:<Analytics/>,
    finance:<Finance goal={goal}/>,
    settings:<Settings/>,
  };

  return <>
    <style>{css}</style>
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Inter',-apple-system,sans-serif",color:T.text}}>
      <Sidebar page={page} set={setPage}/>
      <main className="fluxe-main" style={{marginLeft:60,padding:"24px 28px 80px",maxWidth:1100}}>
        <div className="fluxe-topbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:T.text,fontWeight:800,fontSize:16,letterSpacing:-.5}}>FLUXE</span>
            <Badge label="v1.0" color={T.primary} bg={`${T.primary}18`}/>
            <div style={{display:"flex",alignItems:"center",gap:6,background:`${T.teal}0f`,border:`1px solid ${T.teal}25`,borderRadius:20,padding:"4px 12px"}}>
              <Dot color={T.teal} anim/><span style={{color:T.teal,fontSize:11,fontWeight:700}}>{agents.filter(a=>a.on).length} agents running</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{color:T.muted,fontSize:12}}>Goal: <strong style={{color:T.text}}>${goal.toLocaleString()}</strong></div>
            {session?.user&&<TrialBadge user={session.user}/>}
            {session?.user&&<div style={{display:"flex",alignItems:"center",gap:6}}>
              {session.user.image&&<img src={session.user.image} alt="" style={{width:24,height:24,borderRadius:"50%"}}/>}
              <span style={{color:T.muted,fontSize:12}}>{session.user.name?.split(" ")[0]}</span>
            </div>}
            <Btn label="⚙️" small ghost onClick={()=>setPage("settings")}/>
            {session?.user&&<Btn label="Sign out" small ghost onClick={()=>signOut({callbackUrl:"/"})}/>}
          </div>
        </div>
        {PAGES[page]??PAGES.overview}
      </main>
      <ChatBot setPage={setPage} goal={goal} agents={agents}/>
    </div>
  </>;
}

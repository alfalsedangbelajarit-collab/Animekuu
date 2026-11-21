import {useEffect,useRef,useState} from 'react'
declare global{interface Window{YT:any;onYouTubeIframeAPIReady:()=>void}}
type Anime={mal_id:number;title:string;synopsis?:string;score?:number;images:{jpg:{large_image_url:string}};trailer?:{youtube_id?:string}}
type Vid={id:string;title:string;channel:string;thumb:string}
const KEY=import.meta.env.VITE_YT_KEY as string|undefined
const ld=<T,>(k:string,d:T):T=>{try{return JSON.parse(localStorage.getItem(k)||'')as T}catch{return d}}
const sv=(k:string,v:any)=>localStorage.setItem(k,JSON.stringify(v))

function Player({id,onEnd}:{id:string;onEnd:()=>void}){
  const el=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    let p:any,t:any
    const make=()=>{
      p=new window.YT.Player(el.current,{videoId:id,playerVars:{playsinline:1,rel:0,start:ld<number>('t:'+id,0)},
        events:{onStateChange:(e:any)=>{if(e.data===0){sv('t:'+id,0);onEnd()}}}})
      t=setInterval(()=>{try{sv('t:'+id,Math.floor(p.getCurrentTime()))}catch{}},5000)
    }
    if(window.YT?.Player)make()
    else{const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.body.appendChild(s);window.onYouTubeIframeAPIReady=make}
    return()=>{clearInterval(t);try{p?.destroy()}catch{}}
  },[id])
  return <div className="player"><div ref={el}/></div>
}

export default function App(){
  const [tab,setTab]=useState('home')
  const [list,setList]=useState<Anime[]>([])
  const [q,setQ]=useState('')
  const [yq,setYq]=useState('')
  const [vids,setVids]=useState<Vid[]>([])
  const [cur,setCur]=useState(-1)
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)
  const [favs,setFavs]=useState<Anime[]>(ld('favs',[]))
  const [hist,setHist]=useState<Vid[]>(ld('hist',[]))
  const [sel,setSel]=useState<Anime|null>(null)

  const load=async(query:string)=>{
    setErr('');setLoading(true)
    try{
      const u=query?`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`:'https://api.jikan.moe/v4/top/anime?limit=20'
      const r=await fetch(u)
      const j=await r.json()
      if(!r.ok||!j.data)throw new Error(j.message||('HTTP '+r.status))
      setList(j.data)
    }catch(e:any){setErr('Gagal memuat: '+e.message)}
    setLoading(false)
  }
  useEffect(()=>{load('')},[])
  useEffect(()=>{const t=setTimeout(()=>tab==='explore'&&load(q),600);return()=>clearTimeout(t)},[q])

  const ytSearch=async(query:string)=>{
    setErr('')
    if(!KEY){setErr('YouTube API belum dikonfigurasi. Isi secret VITE_YT_KEY (lihat README).');return}
    try{
      const r=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&maxResults=20&q=${encodeURIComponent(query)}&key=${KEY}`)
      const j=await r.json();if(j.error)throw new Error(j.error.message)
      setVids(j.items.map((i:any)=>({id:i.id.videoId,title:i.snippet.title,channel:i.snippet.channelTitle,thumb:i.snippet.thumbnails.medium.url})));setCur(-1)
    }catch(e:any){setErr('YouTube error: '+e.message)}
  }
  const play=(i:number)=>{
    setCur(i);const v=vids[i];const h=[v,...hist.filter(x=>x.id!==v.id)].slice(0,100);setHist(h);sv('hist',h)
  }
  const toggleFav=(a:Anime)=>{
    const n=favs.some(f=>f.mal_id===a.mal_id)?favs.filter(f=>f.mal_id!==a.mal_id):[a,...favs];setFavs(n);sv('favs',n)
  }
  const Cards=({items}:{items:Anime[]})=><div className="grid">{items.map(a=>
    <div className="card" key={a.mal_id} onClick={()=>setSel(a)}><img loading="lazy" src={a.images.jpg.large_image_url}/><p>{a.title}{a.score?` ⭐${a.score}`:''}</p></div>)}</div>

  if(sel)return <div className="app">
    <button onClick={()=>setSel(null)}>← Kembali</button>
    {sel.trailer?.youtube_id&&<Player id={sel.trailer.youtube_id} onEnd={()=>{}}/>}
    <h2>{sel.title}</h2><p>{sel.synopsis}</p>
    <button onClick={()=>toggleFav(sel)}>{favs.some(f=>f.mal_id===sel.mal_id)?'💔 Hapus Favorit':'❤️ Favorit'}</button>
    <button onClick={()=>{setYq(sel.title+' episode');setTab('youtube');setSel(null);ytSearch(sel.title+' episode')}}>▶ Cari di YouTube</button>
  </div>

  return <div className="app">
    <h1>Animekuuuu</h1>
    {err&&<div className="msg">{err}</div>}
    {loading&&<p>Memuat…</p>}
    {cur>=0&&<><Player id={vids[cur].id} onEnd={()=>cur<vids.length-1&&play(cur+1)}/>
      <h3>{vids[cur].title}</h3><p>{vids[cur].channel}</p>
      <button disabled={cur===0} onClick={()=>play(cur-1)}>⏮ Sebelumnya</button>
      <button disabled={cur>=vids.length-1} onClick={()=>play(cur+1)}>Berikutnya ⏭</button></>}
    {tab==='home'&&<><h3>Trending</h3><button onClick={()=>load('')}>🔄 Muat ulang</button><Cards items={list}/></>}
    {tab==='explore'&&<><input placeholder="Cari anime…" value={q} onChange={e=>setQ(e.target.value)}/><Cards items={list}/></>}
    {tab==='youtube'&&<><input placeholder="Cari video/trailer/episode resmi…" value={yq} onChange={e=>setYq(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ytSearch(yq)}/>
      <div className="grid">{vids.map((v,i)=><div className="card v" key={v.id} onClick={()=>play(i)}><img src={v.thumb}/><p>{v.title}</p></div>)}</div></>}
    {tab==='favs'&&(favs.length?<Cards items={favs}/>:<p>Belum ada favorit.</p>)}
    {tab==='profile'&&<><p>Favorit: {favs.length} · Ditonton: {hist.length}</p>
      <button onClick={()=>{setHist([]);sv('hist',[])}}>Hapus riwayat</button>
      {hist.map(v=><p key={v.id}>🎬 {v.title}</p>)}</>}
    <nav>{[['home','🏠 Home'],['explore','🔎 Explore'],['youtube','▶ YouTube'],['favs','❤️ Favorit'],['profile','👤 Profil']].map(([k,l])=>
      <button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}</nav>
  </div>
    }

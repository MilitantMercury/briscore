"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { avatarOptions, PlayerAvatar } from "@/components/player-avatar";

async function compressAvatar(file: File): Promise<File> {
  if (file.size <= 2_097_152) return file;
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  for (const quality of [0.88, 0.76, 0.64, 0.52]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= 2_097_152) return new File([blob], "avatar.webp", { type: "image/webp" });
  }
  throw new Error("AVATAR_TOO_LARGE");
}

export default function ProfilePage() {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("bastoni"); const [avatarImage, setAvatarImage] = useState("");
  const [effect, setEffect] = useState(""); const [file, setFile] = useState<File | null>(null); const [previewUrl, setPreviewUrl] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { const user = data.user; setEmail(user?.email || ""); setName(user?.user_metadata?.display_name || user?.user_metadata?.full_name || ""); setAvatar(user?.user_metadata?.avatar || "bastoni"); setAvatarImage(user?.user_metadata?.avatarImage || ""); setEffect(user?.user_metadata?.avatarEffect || ""); }); }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); const next = name.trim(); if (!next || next.length > 40) { setMessage("Inserisci un nome da 1 a 40 caratteri."); return; }
    let imagePath = avatarImage;
    if (file) { if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setMessage("Scegli un JPG, PNG o WebP."); return; }
      const { data: userData } = await supabase.auth.getUser(); if (!userData.user) { setMessage("Accedi di nuovo per aggiornare il profilo."); return; }
      setMessage(file.size > 2_097_152 ? "Riduciamo la foto per l’avatar…" : "Carichiamo l’avatar…"); let uploadFile: File;
      try { uploadFile = await compressAvatar(file); } catch { setMessage("Non riesco a ridurre questa immagine."); return; }
      imagePath = `${userData.user.id}/avatar.${uploadFile.type === 'image/png' ? 'png' : uploadFile.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(imagePath, uploadFile, { upsert: true, contentType: uploadFile.type }); if (uploadError) { setMessage("Non riesco a caricare l’immagine."); return; }
    }
    const { error } = await supabase.auth.updateUser({ data: { display_name: next, avatar, avatarImage: imagePath, avatarEffect: effect } });
    setMessage(error ? "Non riesco ad aggiornare il profilo." : "Profilo aggiornato.");
  }
  return <main className="standalone-page profile-scene">
    <Link className="back-link deck-back" href="/">← Torna al tavolo</Link>
    <section className="profile-hero"><span className="eyebrow">LA TUA CARTA GIOCATORE</span><h1>La tua carta<span className="lime">.</span></h1><p>Personalizza immagine, seme ed effetto: al tavolo ti riconoscono tutti.</p></section>
    <form className="profile-form" onSubmit={save}>
      <section className="profile-card-preview">
        <span className="profile-card-label">IL TUO POSTO AL TAVOLO</span>
        <div className="profile-avatar-frame"><PlayerAvatar avatar={avatar} imagePath={avatarImage} previewUrl={previewUrl} effect={effect} name={name || "Giocatore"} size="large" /></div>
        <b>{name || "Il tuo nome"}</b><small>{effect ? `Effetto: ${effect === "fire" ? "Fuoco" : effect === "water" ? "Acqua" : "Scintille"}` : "Nessun effetto"}</small>
      </section>
      <section className="panel profile-controls deal-card">
        <div className="profile-controls-heading"><span className="eyebrow">PERSONALIZZA</span><h2>Costruisci la tua carta</h2></div>
        <div className="profile-control-grid">
          <fieldset className="profile-symbols"><legend>Simbolo</legend><div className="avatar-options">{avatarOptions.map(option=><button type="button" key={option} className={avatar===option?"avatar-choice selected":"avatar-choice"} onClick={()=>{setAvatar(option);setAvatarImage("");setFile(null);setPreviewUrl("");}}><PlayerAvatar avatar={option} name={option} size="small" /></button>)}</div></fieldset>
          <label className="avatar-upload profile-upload"><span className="upload-symbol" aria-hidden="true">{file ? "✓" : "＋"}</span><span className="upload-copy"><b>{file ? "Nuova foto selezionata" : "Carica una foto"}</b><small>{file ? file.name : "JPG, PNG o WebP · riduciamo automaticamente le foto grandi."}</small></span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const next=event.target.files?.[0]||null;setFile(next);setPreviewUrl(next ? URL.createObjectURL(next) : "");if(next)setAvatarImage("");}} /></label>
        </div>
        <fieldset className="effect-picker profile-effects"><legend>Effetto attorno all’avatar</legend><div>{[["","Nessuno"],["fire","Fuoco"],["water","Acqua"],["sparkles","Scintille"]].map(([value,label])=><button type="button" key={value} className={effect===value?"effect-choice selected":"effect-choice"} onClick={()=>setEffect(value)}><span className="effect-mini"><PlayerAvatar avatar={avatar} imagePath={avatarImage} previewUrl={previewUrl} effect={value} name={label} size="small" /></span><span>{label}</span></button>)}</div></fieldset>
        <div className="profile-fields"><label>Nome visualizzato<input value={name} onChange={event=>setName(event.target.value)} maxLength={40} /></label><label>Email<input value={email} readOnly /></label></div>
        <button className="primary profile-save">Salva la tua carta <span>→</span></button>
        {message&&<p className="info" role="status">{message}</p>}
      </section>
    </form>
  </main>;
}

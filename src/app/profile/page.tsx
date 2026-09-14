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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("bastoni");
  const [avatarImage, setAvatarImage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setEmail(user?.email || "");
      setName(user?.user_metadata?.display_name || user?.user_metadata?.full_name || "");
      setAvatar(user?.user_metadata?.avatar || "bastoni");
      setAvatarImage(user?.user_metadata?.avatarImage || "");
    });
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (!next || next.length > 40) {
      setMessage("Inserisci un nome da 1 a 40 caratteri.");
      return;
    }
    let imagePath = avatarImage;
    if (file) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setMessage("Scegli un JPG, PNG o WebP."); return; }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setMessage("Accedi di nuovo per aggiornare il profilo."); return; }
      setMessage(file.size > 2_097_152 ? "Riduciamo la foto per l’avatar…" : "Carichiamo l’avatar…");
      let uploadFile: File;
      try { uploadFile = await compressAvatar(file); } catch { setMessage("Non riesco a ridurre questa immagine. Prova con un’altra foto."); return; }
      const extension = uploadFile.type === 'image/png' ? 'png' : uploadFile.type === 'image/webp' ? 'webp' : 'jpg';
      imagePath = `${userData.user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(imagePath, uploadFile, { upsert: true, contentType: uploadFile.type });
      if (uploadError) { setMessage("Non riesco a caricare l’immagine."); return; }
    }
    const { error } = await supabase.auth.updateUser({ data: { display_name: next, avatar, avatarImage: imagePath } });
    setMessage(error ? "Non riesco ad aggiornare il profilo." : "Profilo aggiornato. Il nuovo avatar apparirà ai prossimi aggiornamenti del tavolo.");
  }
  return <main className="standalone-page"><Link className="back-link" href="/">← Torna al tavolo</Link><section className="panel profile-page card-surface"><span className="eyebrow">IL TUO ACCOUNT</span><h1>La tua carta<span className="lime">.</span></h1><p className="muted">Scegli un simbolo oppure carica una tua immagine.</p><form onSubmit={save}><div className="avatar-picker"><div className="avatar-preview"><PlayerAvatar avatar={avatar} imagePath={avatarImage} name={name || "Giocatore"} size="large" /><b>{name || "Il tuo nome"}</b></div><fieldset><legend>Avatar</legend><div className="avatar-options">{avatarOptions.map(option=><button type="button" key={option} className={avatar===option?"avatar-choice selected":"avatar-choice"} onClick={()=>{setAvatar(option);setAvatarImage("");setFile(null);}} aria-label={`Scegli ${option}`}><PlayerAvatar avatar={option} name={option} size="small" /></button>)}</div><label className="avatar-upload">Immagine personale<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const next=event.target.files?.[0]||null;setFile(next); if(next) setAvatarImage("");}} /><small>JPG, PNG o WebP · massimo 2 MB</small></label></fieldset></div><label>Nome visualizzato<input value={name} onChange={event=>setName(event.target.value)} maxLength={40} placeholder="Come vuoi essere chiamato?" /></label><label>Email<input value={email} readOnly /></label><button className="primary full">Salva il profilo</button></form>{message && <p className="info" role="status">{message}</p>}</section></main>;
}

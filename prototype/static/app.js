'use strict';
const $=id=>document.getElementById(id);
let pulse=null,audio=null,result=null,modelReady=false,busy=false,uiPreview=false,simulated=false,currentStep='pulse';
let ppg=null,pulseTimer=null,pulseAbort=null,pulseStarted=0,goodWindows=[],waveValues=[],pulseAttempt=0;
let recorder=null,micStream=null,recordTimer=null,recordStarted=0,recordAttempt=0,previewUrl=null,audioAttempt=0;
const apiKey=document.querySelector('meta[name="api-key"]').content;
const qualityText={no_finger:'Tutup kamera belakang dengan ujung jari. Layar menghadapmu.',settling:'Tahan jari sampai sinyal stabil.',collecting:'Mengumpulkan sinyal. Tetap diam.',saturated:'Terlalu terang. Sesuaikan posisi jari perlahan.',weak_pulse:'Sinyal belum terbaca. Periksa posisi jari dan pencahayaan.',motion:'Usahakan tangan tetap diam.',irregular:'Sinyal belum stabil. Istirahat dan coba kembali.',morphology:'Sesuaikan posisi jari perlahan.',fft_disagree:'Pembacaan belum konsisten. Tetap diam.',double_count:'Pembacaan belum konsisten. Tetap diam.',missed_beats:'Pembacaan belum konsisten. Tetap diam.'};

function error(id,message=''){ $(id).textContent=message;$(id).hidden=!message; }
function go(step){
  if(busy)return;
  if(step==='audio'&&!pulse)step='pulse';
  if(step==='questionnaire'&&(!pulse||!audio||!$('cough-confirm').checked))step=pulse?'audio':'pulse';
  if(step==='result'&&result?.stage!=='questionnaire')step=audio?'questionnaire':pulse?'audio':'pulse';
  if(step!=='pulse'&&ppg)stopPulse();
  if(step!=='audio'&&(micStream||$('stop-record').hidden===false))cancelRecording();
  currentStep=step;document.body.classList.add('screening');$('landing').hidden=true;$('check').hidden=false;
  if(location.hash!=='#check')history.pushState(null,'','#check');
  const steps=['pulse','audio','questionnaire','result'],index=steps.indexOf(step);
  for(const s of steps)$(s+'-panel').hidden=s!==step;
  $('step-count').textContent=`LANGKAH ${index+1} DARI 4`;$('questionnaire-details').open=true;
  document.querySelectorAll('[data-step]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.classList.toggle('done',i<index);b.setAttribute('aria-current',i===index?'step':'false');});
  window.scrollTo({top:0,behavior:'instant'});const heading=$(step+'-panel').querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
}
function showHome(){if(busy)return;stopPulse();cancelRecording();$('landing').hidden=false;$('check').hidden=true;document.body.classList.remove('screening');}
function update(){
  $('analyze-button').disabled=busy||(!modelReady&&!uiPreview)||!pulse||!audio||!$('cough-confirm').checked;
  $('demo-button').disabled=busy||uiPreview;
  $('demo-button').hidden=uiPreview;$('server-status').parentElement.hidden=uiPreview;$('preview-tools').hidden=!uiPreview;$('simulation-banner').hidden=!simulated;
  for(const id of ['start-pulse','record-button','audio-upload','use-manual','manual-bpm'])$(id).disabled=busy||simulated;
  $('analyze-hint').textContent=uiPreview?'Mode UI: formulir dapat ditinjau. Hasil contoh tersedia di panel pratinjau.':!modelReady?'Model belum siap. Tunggu atau gunakan mode pratinjau.':(!pulse||!audio||!$('cough-confirm').checked)?'Lengkapi denyut, rekaman batuk, dan konfirmasi rekaman.':'Siap melanjutkan pemeriksaan.';
  $('next-audio').hidden=!pulse;
  $('summary-pulse').textContent=pulse?`${pulse.bpm} BPM · ${pulse.source==='simulation'?'contoh fiktif':pulse.source==='demo'?'demo':pulse.source==='manual'?'alat referensi':'kamera'}`:'Belum tersedia';
  $('summary-audio').textContent=audio?`${audio.duration.toFixed(1)} detik · ${audio.source==='simulation'?'contoh fiktif':audio.source==='demo'?'demo':'rekamanmu'}`:'Belum tersedia';
  $('demo-banner').hidden=!(pulse?.source==='demo'||audio?.source==='demo');
}
function setBusy(value){
  busy=value;$('busy').hidden=!value;
  for(const id of ['demo-button','start-pulse','use-manual','record-button','audio-upload','questionnaire-button','reset-button','new-check','download-result','manual-bpm','cough-confirm'])$(id).disabled=value;
  $('questionnaire').querySelectorAll('input,select').forEach(el=>{el.disabled=value;});update();
}
function invalidate(){result=null;$('download-result').hidden=true;$('summary-clinical').textContent='Belum diisi';$('result-content').replaceChildren();$('questionnaire-details').open=false;error('result-error');}
function clearAudio(){audioAttempt++;audio=null;invalidate();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;$('audio-preview').pause();$('audio-preview').removeAttribute('src');$('audio-preview').hidden=true;$('audio-tag').textContent='Belum direkam';$('audio-tag').classList.remove('success');$('audio-filename').textContent='Rekaman diproses setelah kamu memilih untuk melanjutkan.';$('cough-confirm').checked=false;update();}
function drawWave(value){
  if(Number.isFinite(value)){waveValues.push(value);if(waveValues.length>280)waveValues.shift();}
  const c=$('pulse-wave'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  ctx.strokeStyle='#72080822';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,50);ctx.lineTo(c.width,50);ctx.stroke();
  if(waveValues.length<3)return;
  const low=Math.min(...waveValues),span=Math.max(...waveValues)-low;if(span<1e-8)return;
  ctx.strokeStyle='#a10728';ctx.lineWidth=2;ctx.beginPath();waveValues.forEach((v,i)=>{const x=i*c.width/279,y=85-(v-low)*70/span;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
}
function stopPulse(){
  pulseAttempt++;clearInterval(pulseTimer);pulseTimer=null;
  pulseAbort?.abort();pulseAbort=null;if(ppg){ppg.stop();ppg.destroy();ppg=null;}
  $('stop-pulse').hidden=true;$('start-pulse').hidden=false;
}
function acceptPulse(value){
  if(!Number.isFinite(value.bpm)||value.bpm<45||value.bpm>220)throw new Error('Denyut di luar rentang prototipe (45–220 BPM).');
  invalidate();pulse={...value,bpm:Math.round(value.bpm)};$('bpm').textContent=pulse.bpm;
  $('pulse-tag').textContent=value.source==='demo'?'Rekaman demo':value.source==='manual'?'Hasil alat referensi':'Pengukuran selesai';
  $('pulse-tag').classList.add('success');update();
}
async function startPulse(){
  if(busy)return;stopPulse();invalidate();pulse=null;update();error('pulse-error');
  $('bpm').textContent='—';$('pulse-tag').textContent='Sedang mengukur';$('pulse-tag').classList.remove('success');$('pulse-progress').value=0;waveValues=[];drawWave();goodWindows=[];
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){error('pulse-error','Kamera memerlukan HTTPS di HP. Buka alamat HTTPS proyek.');return;}
  const attempt=++pulseAttempt;const capture=new PPG.PPG({signal:{respiration:false},debug:{persistLastSession:false},motion:false});ppg=capture;pulseAbort=new AbortController();
  $('start-pulse').hidden=true;$('stop-pulse').hidden=false;$('pulse-guidance').textContent='Izinkan kamera, lalu tutup kamera belakang dengan ujung jari. Layar menghadapmu.';
  capture.addEventListener('ready',e=>{if(attempt===pulseAttempt&&!e.detail.torchSupported)$('pulse-guidance').textContent='Lampu kilat tidak tersedia. Gunakan pencahayaan cukup dan tunggu sinyal stabil.';});
  capture.addEventListener('state',e=>{if(attempt===pulseAttempt)$('pulse-guidance').textContent=e.detail.state==='MEASURING'?'Tetap diam selama mencari sinyal yang konsisten.':qualityText[e.detail.state==='NO_FINGER'?'no_finger':'settling'];});
  capture.addEventListener('waveform',e=>{if(attempt===pulseAttempt)drawWave(e.detail.value);});
  capture.addEventListener('metrics',e=>{
    if(attempt!==pulseAttempt)return;const m=e.detail;
    if(m.quality?.good&&Number.isFinite(m.heartRate)&&m.heartRate>=45&&m.heartRate<=220){
      goodWindows.push({bpm:m.heartRate,time:performance.now()});if(goodWindows.length>3)goodWindows.shift();$('bpm').textContent=Math.round(m.heartRate);$('pulse-guidance').textContent='Sinyal terbaca. Angka masih sementara; tunggu sampai selesai.';
    }else{goodWindows=[];$('bpm').textContent='—';$('pulse-guidance').textContent=qualityText[m.quality?.code]||'Sinyal belum stabil. Tetap diam dan sesuaikan posisi jari.';}
  });
  capture.addEventListener('error',e=>{if(attempt===pulseAttempt){error('pulse-error',cameraError(e.detail.error));stopPulse();$('pulse-guidance').textContent='Pengukuran belum selesai. Silakan coba kembali.';}});
  try{
    await capture.start(pulseAbort.signal);if(attempt!==pulseAttempt)return;
    pulseStarted=performance.now();pulseTimer=setInterval(()=>{
      const seconds=(performance.now()-pulseStarted)/1000;$('pulse-progress').value=Math.min(30,seconds);
      const values=goodWindows.map(v=>v.bpm);
      if(seconds>=30&&values.length===3&&performance.now()-goodWindows[2].time<7000&&Math.max(...values)-Math.min(...values)<=8){
        const bpm=[...values].sort((a,b)=>a-b)[1];stopPulse();acceptPulse({bpm,source:'camera',quality_passed:true,capture_seconds:seconds,good_windows:3});$('pulse-guidance').textContent='Pengukuran selesai. Lanjutkan ke rekaman batuk.';
      }else if(seconds>=75){stopPulse();$('bpm').textContent='—';$('pulse-tag').textContent='Coba kembali';error('pulse-error','Sinyal stabil belum cukup. Sesuaikan jari dan coba kembali.');}
    },250);
  }catch(e){if(attempt===pulseAttempt){stopPulse();error('pulse-error',cameraError(e));}}
}
function cameraError(e){return e?.code==='permission_denied'||e?.name==='NotAllowedError'?'Izin kamera ditolak. Aktifkan akses kamera di pengaturan situs, lalu coba kembali.':e?.name==='NotFoundError'||e?.code==='no_camera'?'Kamera tidak ditemukan. Gunakan ponsel dengan kamera belakang.':'Kamera tidak tersedia. Tutup aplikasi kamera lain, periksa izin, lalu coba kembali.';}

function bytesToBase64(buffer){const b=new Uint8Array(buffer);let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);}
function wavFromBuffer(buffer){
  const n=buffer.length,channels=buffer.numberOfChannels,ab=new ArrayBuffer(44+n*2),v=new DataView(ab);
  const str=(i,s)=>{for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j));};
  str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
  const arrays=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<n;i++){let x=0;for(const a of arrays)x+=a[i]/channels;x=Math.max(-1,Math.min(1,x));v.setInt16(44+i*2,x<0?x*32768:x*32767,true);}return ab;
}
function setAudio(value,blob){
  audioAttempt++;invalidate();audio=value;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('audio-preview').src=previewUrl;$('audio-preview').hidden=false;
  $('audio-filename').textContent=value.name;$('audio-tag').textContent=`${value.duration.toFixed(1)} detik`;$('audio-tag').classList.add('success');$('record-time').textContent='Rekaman siap';$('cough-confirm').checked=false;update();
}
async function loadAudio(blob,name){
  const attempt=++audioAttempt;error('audio-error');if(blob.size>12_000_000)throw new Error('Berkas terlalu besar. Pilih rekaman maksimal 30 detik.');
  const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Audio tidak dapat diproses. Gunakan browser terbaru.');
  const ctx=new C();let decoded;
  try{decoded=await ctx.decodeAudioData(await blob.arrayBuffer());}catch{throw new Error('Format audio tidak terbaca. Coba WAV atau MP3, atau rekam langsung.');}finally{await ctx.close();}
  if(decoded.duration<.25||decoded.duration>30)throw new Error('Durasi rekaman harus 0,25–30 detik.');
  if(attempt!==audioAttempt)return;
  const wav=wavFromBuffer(decoded);setAudio({data:bytesToBase64(wav),duration:decoded.duration,name,source:'user'},new Blob([wav],{type:'audio/wav'}));
}
function releaseMic(){clearInterval(recordTimer);recordTimer=null;micStream?.getTracks().forEach(t=>t.stop());micStream=null;$('stop-record').hidden=true;$('record-button').hidden=false;document.querySelector('.record-zone').classList.remove('recording');}
function stopRecording(){recordAttempt++;if(recorder?.state==='recording')recorder.stop();releaseMic();}
function cancelRecording(){stopRecording();recordAttempt++;}
async function startRecording(){
  if(busy)return;error('audio-error');if(!navigator.mediaDevices?.getUserMedia){error('audio-error','Mikrofon memerlukan HTTPS di HP. Kamu juga bisa mengunggah rekaman.');return;}
  clearAudio();const attempt=++recordAttempt;let chunks=[];
  $('record-button').hidden=true;$('stop-record').hidden=false;$('record-time').textContent='Menunggu izin mikrofon…';
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    if(attempt!==recordAttempt){stream.getTracks().forEach(t=>t.stop());return;}micStream=stream;
    recorder=new MediaRecorder(stream);const thisRecorder=recorder;
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{const blob=new Blob(chunks,{type:thisRecorder.mimeType});if(attempt+1!==recordAttempt)return;try{await loadAudio(blob,'Rekaman batuk');}catch(e){error('audio-error',e.message);}};
    recorder.onerror=()=>{stopRecording();error('audio-error','Rekaman terhenti. Periksa mikrofon atau unggah audio.');};
    recorder.start();recordStarted=performance.now();document.querySelector('.record-zone').classList.add('recording');
    recordTimer=setInterval(()=>{const t=(performance.now()-recordStarted)/1000;$('record-time').textContent=`Recording · ${t.toFixed(0)} detik`;
      if(t>=28)stopRecording();},200);
  }catch(e){releaseMic();error('audio-error',e.name==='NotAllowedError'?'Izin mikrofon ditolak. Aktifkan akses atau unggah rekaman batuk.':'Mikrofon tidak tersedia. Coba kembali atau unggah rekaman.');}
}

function showResult(data){
  result=data;if(data.stage==='initial'){setBusy(false);go('questionnaire');return;}
  const negative=data.category==='research_screening_negative';
  const box=document.createElement('div');box.className='result-box'+(negative?' negative':'');
  const h=document.createElement('h3');h.textContent=(data.simulation?'Contoh: ':'')+(negative?'Skrining negatif':'Perlu pemeriksaan lanjutan');
  const p=document.createElement('p');p.textContent=negative?'Skor berada di bawah ambang skrining. Hasil ini tidak menyingkirkan TB.':'Skor memenuhi ambang skrining. Hasil ini tidak memastikan bahwa kamu memiliki TB.';box.append(h,p);
  const advice=document.createElement('section');advice.className='screening-guidance';
  const heading=document.createElement('h3');heading.textContent='Apa langkah selanjutnya?';
  const next=document.createElement('p');next.className='next-step';next.textContent=negative?'Tetap konsultasikan kondisi ke tenaga kesehatan jika batuk menetap, gejala memburuk, atau ada kontak erat dengan orang dengan TB.':'Hubungi Puskesmas atau fasilitas kesehatan untuk penilaian dan membahas pemeriksaan TB lebih lanjut.';
  const note=document.createElement('p');note.textContent='Ini adalah skrining awal dalam penelitian, bukan diagnosis. Tenaga kesehatan menentukan pemeriksaan lanjutan yang sesuai.';
  const link=document.createElement('a');link.href='https://www.who.int/news-room/questions-and-answers/item/systematic-screening-for-tb';link.target='_blank';link.rel='noopener';link.textContent='Penjelasan skrining dari WHO ↗';advice.append(heading,next,note,link);
  const details=document.createElement('details');details.className='result-details';const summary=document.createElement('summary');summary.textContent='Lihat rincian hasil';details.append(summary);
  const score=document.createElement('p');score.textContent=`Skor model: ${(100*data.score).toFixed(1)}/100. Ambang: ${(100*data.threshold).toFixed(2)}/100. Skor ini bukan persentase kemungkinan kamu memiliki TB.`;
  const meta=document.createElement('p');meta.className='result-meta';meta.textContent=data.simulation?'SIMULASI UI. Angka dan hasil fiktif; tidak ada analisis model.':`${data.demo?'Data demo · ':''}${data.audio_seconds} detik audio · ${data.elapsed_seconds} detik pemrosesan`;details.append(score,meta);
  $('result-content').replaceChildren(box,advice,details);$('result-tag').textContent=data.simulation?'CONTOH FIKTIF':'Batuk + denyut + gejala';$('download-result').hidden=false;$('summary-clinical').textContent='9 jawaban lengkap';setBusy(false);go('result');
}
async function analyze(stage){
  if(busy||!pulse||!audio)return;
  if(stage==='initial'&&uiPreview){go('questionnaire');return;}
  if(simulated&&uiPreview){setBusy(true);setTimeout(()=>{setBusy(false);showResult(simulationResult(false));},600);return;}
  if(simulated){error('result-error','Data simulasi tidak dapat dikirim untuk prediksi. Mulai ulang sesi.');return;}
  if(!modelReady){error('result-error','Model belum tersedia. Pilih contoh hasil dari panel pratinjau untuk meninjau tampilan.');return;}
  if(!$('cough-confirm').checked){error('audio-error','Konfirmasi bahwa rekaman berisi batuk.');return;}
  const clinical=stage==='questionnaire'?Object.fromEntries([...new FormData($('questionnaire'))].map(([k,v])=>[k,Number(v)])):null;
  const payload={stage,pulse,audio:audio.data,audio_source:audio.source,...(clinical?{clinical}:{})};setBusy(true);error('audio-error');error('result-error');
  try{
    const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-MVP-Key':apiKey},body:JSON.stringify(payload)});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Analisis belum selesai. Silakan coba kembali.');showResult(d);
  }catch(e){error(stage==='initial'?'audio-error':'result-error',e.message==='Failed to fetch'?'Koneksi terputus. Periksa server proyek dan coba kembali.':e.message);}
  finally{setBusy(false);}
}
async function demo(){
  if(busy)return;stopPulse();cancelRecording();error('pulse-error');error('audio-error');setBusy(true);
  try{
    const r=await fetch('/api/demo');if(!r.ok)throw new Error('Data demo tidak tersedia.');const d=await r.json();const engine=new PPG.PpgEngine({respiration:false});let windows=[];
    for(const [t,red,green,blue] of d.ppg_samples){const v=engine.push({t,r:red,g:green,b:blue});drawWave(v.waveform);if(v.window){if(v.window.quality.good)windows.push(v.window.heartRate);else windows=[];}}
    if(windows.length<3)throw new Error('The demo signal did not pass the quality check.');const latest=windows.slice(-3).sort((a,b)=>a-b);if(latest[2]-latest[0]>8)throw new Error('Demo readings are not consistent.');
    acceptPulse({bpm:latest[1],source:'demo',quality_passed:true,capture_seconds:d.ppg_samples.at(-1)[0],good_windows:windows.length});$('pulse-progress').value=30;$('pulse-guidance').textContent='Pulse was calculated from a demo PPG recording, not your camera.';
    const bin=Uint8Array.from(atob(d.audio),c=>c.charCodeAt(0));setAudio({data:d.audio,duration:d.audio_seconds,name:'Research cough sample',source:'demo'},new Blob([bin],{type:'audio/wav'}));
    for(const [name,value] of Object.entries(d.clinical_demo))$('questionnaire').elements.namedItem(name).value=String(value);
    $('cough-confirm').checked=true;go('audio');
  }catch(e){error('pulse-error',e.message);go('pulse');}finally{setBusy(false);}
}
function reset(){if(busy)return;stopPulse();cancelRecording();simulated=false;pulse=null;clearAudio();$('pulse-panel').querySelector('details').open=false;$('bpm').textContent='—';$('pulse-tag').textContent='Belum diukur';$('pulse-tag').classList.remove('success');$('audio-upload').value='';$('record-time').textContent='Siap merekam';$('pulse-guidance').textContent='Minimal 30 detik. Tunggu sampai sinyal stabil.';$('pulse-progress').value=0;$('manual-bpm').value='';$('questionnaire').reset();waveValues=[];drawWave();for(const id of ['pulse-error','audio-error','result-error'])error(id);update();go('pulse');}
async function health(){
  try{const r=await fetch('/api/health');if(!r.ok)throw Error();const d=await r.json();modelReady=d.ready;uiPreview=d.ui_only===true;const el=$('server-status');el.replaceChildren();const dot=document.createElement('span');dot.className='status-dot';el.append(dot,document.createTextNode(d.ui_only?'Pratinjau tampilan · model tidak digunakan':d.ready?'Siap untuk pemeriksaan':d.error?'Model belum tersedia':'Menyiapkan model…'));el.classList.toggle('ready',d.ready);el.classList.toggle('failed',!!d.error);}
  catch{modelReady=false;$('server-status').textContent='Koneksi terputus. Periksa server proyek.';}update();
}
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.step)));
$('start-pulse').addEventListener('click',startPulse);$('stop-pulse').addEventListener('click',()=>{stopPulse();$('bpm').textContent='—';$('pulse-tag').textContent='Dihentikan';$('pulse-guidance').textContent='Pengukuran dihentikan. Mulai kembali untuk melanjutkan.';});
$('use-manual').addEventListener('click',()=>{try{const value=$('manual-bpm').value;if(!value)throw new Error('Masukkan hasil alat referensi terlebih dahulu.');const bpm=Number(value);if(!Number.isFinite(bpm)||bpm<45||bpm>220)throw new Error('Masukkan denyut terukur antara 45–220 BPM.');stopPulse();error('pulse-error');acceptPulse({bpm,source:'manual'});$('pulse-guidance').textContent='Hasil alat dicatat sebagai input manual.';}catch(e){error('pulse-error',e.message);}});
$('next-audio').addEventListener('click',()=>go('audio'));$('record-button').addEventListener('click',startRecording);$('stop-record').addEventListener('click',stopRecording);
$('audio-upload').addEventListener('change',async e=>{if(!e.target.files[0])return;cancelRecording();clearAudio();try{await loadAudio(e.target.files[0],e.target.files[0].name);}catch(err){error('audio-error',err.message);}});
$('cough-confirm').addEventListener('change',()=>{invalidate();update();});$('analyze-button').addEventListener('click',()=>analyze('initial'));
$('questionnaire').addEventListener('submit',e=>{e.preventDefault();if($('questionnaire').reportValidity())analyze('questionnaire');});
$('questionnaire').addEventListener('input',()=>{if(result?.stage==='questionnaire'){$('download-result').hidden=true;$('summary-clinical').textContent='Jawaban berubah; perbarui hasil';const meta=document.querySelector('.result-meta');if(meta)meta.textContent='Jawaban berubah. Jalankan pemeriksaan kembali untuk memperbarui hasil.';}});
$('demo-button').addEventListener('click',demo);$('reset-button').addEventListener('click',reset);$('new-check').addEventListener('click',reset);
$('download-result').addEventListener('click',()=>{if(!result)return;const data={...result,pulse,created_at:new Date().toISOString(),notice:result.simulation?'SIMULASI UI: data fiktif, bukan hasil pemeriksaan.':'Ringkasan prototipe riset. Bukan diagnosis.'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=result.simulation?'tbcatch-SIMULASI-UI.json':'tbcatch-ringkasan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ppg){stopPulse();$('bpm').textContent='—';$('pulse-tag').textContent='Dihentikan';$('pulse-guidance').textContent='Pengukuran terhenti saat halaman tidak aktif. Mulai kembali untuk melanjutkan.';}if(document.hidden&&micStream){cancelRecording();error('audio-error','Rekaman terhenti saat halaman tidak aktif. Rekam kembali untuk melanjutkan.');}});
window.addEventListener('pagehide',()=>{stopPulse();cancelRecording();});drawWave();update();health();setInterval(health,4000);

function simulationResult(negative){return {stage:'questionnaire',simulation:true,demo:true,category:negative?'research_screening_negative':'research_screening_positive',score:negative?.08:.32,threshold:2/11,audio_seconds:8,elapsed_seconds:0};}
function seedPreview(){
  stopPulse();cancelRecording();clearAudio();simulated=true;pulse={bpm:76,source:'simulation'};audio={duration:8,source:'simulation',name:'Contoh rekaman fiktif'};
  $('bpm').textContent='76';$('pulse-tag').textContent='Contoh fiktif';$('pulse-guidance').textContent='SIMULASI: 76 BPM, bukan pengukuran kamera.';$('pulse-progress').value=30;
  $('audio-tag').textContent='Contoh fiktif';$('record-time').textContent='Contoh rekaman · 8 detik';$('audio-filename').textContent='SIMULASI: tidak ada audio pasien.';$('audio-preview').hidden=true;$('cough-confirm').checked=true;
  for(const el of $('questionnaire').elements){if(!el.name)continue;if(el.type==='radio')el.checked=el.value==='0';else el.value=el.name==='age'?35:el.name==='reported_cough_dur'?14:0;}
  result=null;update();
}
document.querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{
  if(!uiPreview||busy)return;seedPreview();for(const id of ['pulse-error','audio-error','result-error'])error(id);
  const kind=b.dataset.preview;
  if(kind==='positive'||kind==='negative'){showResult(simulationResult(kind==='negative'));return;}
  go(kind==='form'?'questionnaire':kind==='audio'||kind==='empty'?'audio':'pulse');
  if(kind==='permission'||kind==='weak'){pulse=null;$('bpm').textContent='—';$('pulse-progress').value=0;$('pulse-tag').textContent='Contoh gagal';error('pulse-error',kind==='permission'?'CONTOH: izin kamera ditolak. Aktifkan akses kamera di pengaturan situs, lalu coba kembali.':'CONTOH: sinyal belum stabil. Atur posisi jari dan istirahatkan tangan.');}
  if(kind==='empty'){audio=null;$('cough-confirm').checked=false;error('audio-error','CONTOH: rekaman terlalu pelan atau kosong. Rekam kembali lebih dekat ke mikrofon.');}update();
}));
$('back-step').addEventListener('click',()=>{if(busy)return;const steps=['pulse','audio','questionnaire','result'];const index=steps.indexOf(currentStep);if(index===0){location.hash='hero';showHome();}else go(steps[index-1]);});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{if(busy){e.preventDefault();return;}if(a.hash==='#check'){e.preventDefault();go(currentStep);}else showHome();}));
window.addEventListener('hashchange',()=>{if(location.hash==='#check')go(currentStep);else showHome();});
for(const select of [...$('questionnaire').querySelectorAll('select')]){
  if(select.name==='sex')continue;const parent=select.parentElement,fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=parent.childNodes[0].textContent;fieldset.append(legend);const choices=document.createElement('div');choices.className='choices';
  for(const [value,text] of [['0','Tidak'],['1','Ya']]){const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='radio';input.name=select.name;input.value=value;input.required=true;span.textContent=text;label.append(input,span);choices.append(label);}fieldset.append(choices);parent.replaceWith(fieldset);
}
if(location.hash==='#check')go('pulse');
$('exit-simulation').addEventListener('click',reset);

$('questionnaire').addEventListener('input',()=>{result=null;$('download-result').hidden=true;});

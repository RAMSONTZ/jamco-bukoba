(() => {
  const CHUNK = 2_500_000;
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(reader.error || new Error('File read failed'));reader.onabort = () => reject(new Error('File read cancelled'));
    reader.readAsDataURL(blob);
  });
  const mimeOf = file => {
    const detected = file.type.split(';')[0].toLowerCase();
    if (detected.startsWith('image/')) return 'image';
    if (/^(?:video\/(?:mp4|webm|quicktime)|audio\/(?:mp4|webm|ogg|mpeg|wav))$/.test(detected)) return detected;
    const ext = file.name.split('.').pop().toLowerCase();
    return ({mp4:'video/mp4', m4v:'video/mp4',webm:'video/webm',m4a:'audio/mp4',ogg:'audio/ogg',opus:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',mov:'video/quicktime'})[ext] || 'image';
  };

  async function optimizePhoto(file) {
    if (!window.createImageBitmap) return file;
    try {
      const image = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise(resolve => canvas.toBlob(blob => resolve(blob || file), 'image/webp', .84));
      } finally {
        image.close();
      }
    } catch {
      return file;
    }
  }

  const stableFiles=new WeakSet();
  function fileAccessError(error){const e=new Error('Simu haikuweza kusoma faili. Chagua faili hiyo tena kutoka kwenye Gallery au Files.');e.code='FILE_ACCESS';e.cause=error;return e;}
  function isFileAccessError(error){return error?.code==='FILE_ACCESS'||['NotReadableError','NotFoundError','SecurityError'].includes(error?.name);}
  async function snapshotFile(file){
    if(stableFiles.has(file))return file;
    const mime=mimeOf(file),limit=mime.startsWith('video/')?100_000_000:mime.startsWith('audio/')?10_000_000:20_000_000;
    if(!file.size||file.size>limit)throw Error('Faili imezidi MB '+limit/1_000_000+'. Original haijabadilishwa.');
    try{
      // Read all bytes while the file picker still holds its Android content URI.
      // Copying a File object or slicing it alone does not detach the backing provider.
      let bytes;
      if(typeof file.arrayBuffer==='function')bytes=await file.arrayBuffer();
      else bytes=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onabort=()=>reject(new Error('Read cancelled'));r.readAsArrayBuffer(file)});
      if(bytes.byteLength!==file.size)throw new Error('Incomplete file read');
      const stable=new File([bytes],file.name||'media',{type:file.type,lastModified:file.lastModified});stableFiles.add(stable);return stable;
    }catch(error){throw fileAccessError(error);}
  }
  function sendBinaryPart(meta,part,blob,onProgress=()=>{}){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST','/api/social/upload-part',true);
      xhr.timeout=300000;
      xhr.setRequestHeader('Content-Type','application/octet-stream');
      xhr.setRequestHeader('X-Jamco-Upload-Id',meta.id);
      xhr.setRequestHeader('X-Jamco-Upload-Mime',meta.mime);
      xhr.setRequestHeader('X-Jamco-Upload-Size',String(meta.size));
      xhr.setRequestHeader('X-Jamco-Upload-Part',String(part));
      xhr.upload.onprogress=e=>onProgress(Math.min(blob.size,e.loaded));
      xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText)}catch{}if(xhr.status>=200&&xhr.status<300&&data?.part===part)resolve(data);else{const e=new Error(data?.message||'Sehemu ya video haikufika.');e.status=xhr.status||503;reject(e)}};
      xhr.onerror=xhr.ontimeout=xhr.onabort=()=>reject(new Error('Muunganisho umekatika. Endelea kupakia.'));
      xhr.send(blob);
    });
  }
  async function upload(file, api, progress = () => {}) {
    file=await snapshotFile(file);
    const mime=mimeOf(file),size=file.size,limit=mime.startsWith('video/')?100_000_000:mime.startsWith('audio/')?10_000_000:20_000_000;
    if(!size||size>limit)throw Error('Faili imezidi MB '+limit/1_000_000+'. Original haijabadilishwa.');
    const prefix=await file.slice(0,65536).arrayBuffer(),suffix=await file.slice(Math.max(0,size-65536)).arrayBuffer();
    const fingerprint=await crypto.subtle.digest('SHA-256',new Uint8Array([...new Uint8Array(prefix),...new Uint8Array(suffix)]));
    const key='jamco-upload-v2:'+mime+':'+size+':'+encodeURIComponent(file.name||'')+':'+file.lastModified+':'+Array.from(new Uint8Array(fingerprint),x=>x.toString(16).padStart(2,'0')).join('');
    let id;try{id=localStorage.getItem(key)}catch{}if(!id)id=crypto.randomUUID();const meta={id,mime,size};
    try{localStorage.setItem(key,id)}catch{}
    async function request(data){let last;for(let i=0;i<3;i++){try{return await api('upload-part',data)}catch(e){last=e;if(e.status&&e.status<500&&![408,429].includes(e.status))throw e;if(i<2)await new Promise(r=>setTimeout(r,1000*(i+1)))}}throw last}
    async function prepare(result){if(mime.startsWith('video/')){progress(100,'optimize');try{const x=await api('upload-part',{id, optimize:true,quality:'both'});result.playbackReady=x.ready===true;result.playbackQualities=x.qualities||[];}catch{result.playbackReady=false;}}return result;}
    const report=await request({...meta,status:true});if(report.complete){const result=await prepare(report.complete);try{localStorage.removeItem(key)}catch{}progress(100,'ready');return result;}
    const count=Math.ceil(size/CHUNK),done=new Set(report.parts),todo=Array.from({length:count},(_,i)=>i).filter(i=>!done.has(i));let binary=report.binary===true&&typeof XMLHttpRequest==='function';const inflight=new Map();
    let sent=[...done].reduce((n,i)=>n+Math.min(CHUNK,size-i*CHUNK),0),next=0,failure;
    progress(Math.floor(100*sent/size),'upload');
    // First part establishes rate limit; the remaining parts may arrive out of order.
    function tick(){const bytes=sent+[...inflight.values()].reduce((a,b)=>a+b,0);progress(Math.min(99,Math.floor(100*bytes/size)),'upload');}
    async function send(i){const offset=i*CHUNK,blob=file.slice(offset,offset+CHUNK);try{
      if(binary){for(let attempt=0;attempt<3;attempt++){try{await sendBinaryPart(meta,i,blob,n=>{inflight.set(i,n);tick()});break;}catch(e){inflight.delete(i);tick();if([404,405,415].includes(e.status)){binary=false;break;}if(e.status&&e.status<500&&![408,429].includes(e.status))throw e;
        if(attempt===2)throw e;
        // The last response may have been lost even though the server saved the part.
        try{const status=await api('upload-part',{...meta,status:true});if(status.complete||status.parts?.includes(i))break;}catch{}
        await new Promise(r=>setTimeout(r,1000*(attempt+1)));
      }}}
      if(!binary){const data=await toBase64(blob);await request({...meta,part:i,data});}
      sent+=blob.size;
    }finally{inflight.delete(i);tick();}}
    if(todo[0]===0){await send(0);next=1;}
    async function worker(){while(!failure&&next<todo.length){const i=todo[next++];try{await send(i)}catch(e){failure=e}}}
    const connection=navigator.connection,slow=connection?.saveData||/2g/.test(connection?.effectiveType||'')||(connection?.downlink!=null&&connection.downlink<1);const workers=slow?1:(connection?.downlink>=8?3:2);await Promise.all(Array.from({length:workers},worker));if(failure)throw failure;
    progress(100,'verify');const result=await prepare(await request({...meta,finish:true}));try{localStorage.removeItem(key)}catch{}progress(100,'ready');return result;
  }

  function bindRecorder(root, onFile, onError) {
    const start = root.querySelector('[data-record]');
    const state = root.querySelector('[data-record-status]');
    if (!start) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      start.disabled = true;
      state.textContent = 'Unaweza kupakia faili ya sauti kwenye kifaa hiki.';
      return;
    }
    let recorder, stream, timer, context, frame, previewUrl;const wave=document.createElement('canvas');wave.width=480;wave.height=64;wave.className='record-wave';wave.hidden=true;const review=document.createElement('div');review.className='record-review';state.after(wave,review);
    const cleanup = () => {clearTimeout(timer);cancelAnimationFrame(frame);context?.close().catch(()=>{});context=null;stream?.getTracks().forEach(track => track.stop());stream = null;wave.hidden=true;};
    const detach=new MutationObserver(()=>{if(!root.isConnected){cleanup();detach.disconnect();}});
    detach.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pagehide', cleanup, {once:true});
    start.onclick = async () => {
      if (recorder?.state === 'recording') {recorder.stop();return;}if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}review.replaceChildren();
      start.disabled = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({audio:true});
        const preferred = ['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(x => MediaRecorder.isTypeSupported(x));
        recorder = new MediaRecorder(stream, preferred ? {mimeType:preferred, audioBitsPerSecond:64000} : {audioBitsPerSecond:64000});
        const chunks = [];
        recorder.ondataavailable = event => {if (event.data.size) chunks.push(event.data);};
        recorder.onerror = () => {delete start.dataset.recording;cleanup();start.disabled=false;start.textContent='Rekodi sauti';onError('Rekodi haikuhifadhiwa.');};
        recorder.onstop = async () => {
          delete start.dataset.recording;cleanup();
          if(!root.isConnected)return;
          const type = recorder.mimeType.split(';')[0];
          const ext = type === 'audio/mp4' ? 'm4a' : type.split('/')[1] || 'webm';
          start.disabled = true;
          start.textContent = 'Rekodi sauti';
          const file=new File(chunks,'tangazo.'+ext,{type});previewUrl=URL.createObjectURL(file);const player=document.createElement('audio');player.controls=true;player.src=previewUrl;const use=document.createElement('button');use.type='button';use.className='secondary';use.textContent='Tumia rekodi';const discard=document.createElement('button');discard.type='button';discard.className='secondary';discard.textContent='Rekodi upya';review.replaceChildren(player,use,discard);state.textContent='Sikiliza kabla ya kutumia rekodi.';start.disabled=false;discard.onclick=()=>{player.pause();start.click()};use.onclick=async()=>{use.disabled=discard.disabled=start.disabled=true;try{await onFile(file);URL.revokeObjectURL(previewUrl);previewUrl=null;review.replaceChildren()}catch(error){onError(error.message);use.disabled=discard.disabled=false}finally{start.disabled=false}};
        };
        if(!root.isConnected){cleanup();return;}
        recorder.start(500);
        const started=performance.now();wave.hidden=false;try{const AudioCtx=window.AudioContext||window.webkitAudioContext;context=new AudioCtx();const analyser=context.createAnalyser();analyser.fftSize=512;context.createMediaStreamSource(stream).connect(analyser);const samples=new Uint8Array(analyser.fftSize),ctx=wave.getContext('2d');const draw=()=>{if(recorder.state!=='recording')return;analyser.getByteTimeDomainData(samples);ctx.clearRect(0,0,wave.width,wave.height);ctx.strokeStyle='#c79e68';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<samples.length;i++){const x=i/(samples.length-1)*wave.width,y=samples[i]/255*wave.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();const secs=Math.floor((performance.now()-started)/1000);state.textContent='Inarekodi · '+Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');frame=requestAnimationFrame(draw)};draw()}catch{}
        start.dataset.recording='1';
        timer = setTimeout(() => {if (recorder.state === 'recording') recorder.stop();}, 600_000);
        start.textContent = 'Maliza rekodi';
        state.textContent = 'Inarekodi…';
      } catch (error) {
        cleanup();
        onError(error.name === 'NotAllowedError' ? 'Ruhusu maikrofoni ili kurekodi.' : 'Maikrofoni haipatikani.');
      } finally {start.disabled = false;}
    };
  }

  let context;
  const analysers = new WeakMap();
  function meter(media, bars) {
    if (!media || !bars?.length) return;
    let entry = analysers.get(media);
    if (!entry) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context ??= new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        const source = context.createMediaElementSource(media);
        source.connect(analyser);
        analyser.connect(context.destination);
        entry = {analyser, data:new Uint8Array(analyser.frequencyBinCount), frame:0};
        analysers.set(media, entry);
      } catch {return;}
    }
    context.resume().catch(() => {});
    if (entry.frame) return;
    const draw = () => {
      if (media.paused || media.ended || media.muted || !media.isConnected) {
        entry.frame = 0;
        bars.forEach(bar => bar.style.removeProperty('--level'));
        return;
      }
      entry.analyser.getByteFrequencyData(entry.data);
      bars.forEach((bar, i) => bar.style.setProperty('--level', String(.17 + .83 * entry.data[i * 3 + 2] / 255)));
      entry.frame = requestAnimationFrame(draw);
    };
    draw();
  }

  function speak(button, text, language) {
    if (!window.speechSynthesis || !text) return false;
    const synth = window.speechSynthesis;
    if (synth.speaking && button.dataset.speaking) {synth.cancel();return true;}
    const voice = synth.getVoices().find(item => item.lang.toLowerCase().startsWith(language.slice(0, 2)));
    if (!voice && language === 'sw-TZ' && synth.getVoices().length) return false;
    synth.cancel();
    const original = button.textContent;
    const blocks = text.match(/[^.!?\n]{1,210}[.!?]?/g) || [text];
    const finish = () => {button.textContent = original;delete button.dataset.speaking;};
    let index = 0;
    const play = () => {
      if (!button.isConnected || index >= blocks.length) {finish();return;}
      const part = new SpeechSynthesisUtterance(blocks[index++]);
      part.lang = language;
      if (voice) part.voice = voice;
      part.onend = play;
      part.onerror = finish;
      synth.speak(part);
    };
    button.dataset.speaking = '1';
    button.textContent = document.documentElement.lang==='en' ? 'Stop reading' : 'Simamisha kusoma';
    play();
    return true;
  }

  window.JamcoMedia = {upload, snapshotFile, isFileAccessError, bindRecorder, meter, speak};
})();

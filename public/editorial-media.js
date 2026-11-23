(() => {
  const CHUNK = 2_500_000;
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const mimeOf = file => {
    const detected = file.type.split(';')[0].toLowerCase();
    if (detected.startsWith('image/')) return 'image';
    if (/^(?:video\/(?:mp4|webm)|audio\/(?:mp4|webm|ogg|mpeg|wav))$/.test(detected)) return detected;
    const ext = file.name.split('.').pop().toLowerCase();
    return ({mp4:'video/mp4', m4v:'video/mp4',webm:'video/webm',m4a:'audio/mp4',ogg:'audio/ogg',opus:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',mov:'video/mp4'})[ext] || 'image';
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

  async function upload(file, api, progress = () => {}) {
    const mime = mimeOf(file);
    const body = mime === 'image' ? await optimizePhoto(file) : file;
    const size = body.size;
    if (!size || size > (mime.startsWith('audio/') ? 10_000_000 : 20_000_000)) {
      throw Error('Faili imezidi kikomo. Video na picha hadi MB 20, sauti hadi MB 10.');
    }
    const meta = {id:crypto.randomUUID(), mime, size};
    async function request(data) {
      try { return await api('upload-part', data); }
      catch (error) {
        if (error.status && error.status < 500) throw error;
        return api('upload-part', data);
      }
    }
    for (let offset = 0, part = 0; offset < size; offset += CHUNK, part++) {
      const data = await toBase64(body.slice(offset, offset + CHUNK));
      await request({...meta, part, data});
      progress(Math.round(100 * Math.min(size, offset + CHUNK) / size));
    }
    return request({...meta, finish:true});
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
    let recorder, stream, timer;
    const cleanup = () => {clearTimeout(timer);stream?.getTracks().forEach(track => track.stop());stream = null;};
    window.addEventListener('pagehide', cleanup, {once:true});
    start.onclick = async () => {
      if (recorder?.state === 'recording') {recorder.stop();return;}
      start.disabled = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({audio:true});
        const preferred = ['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(x => MediaRecorder.isTypeSupported(x));
        recorder = new MediaRecorder(stream, preferred ? {mimeType:preferred, audioBitsPerSecond:64000} : {audioBitsPerSecond:64000});
        const chunks = [];
        recorder.ondataavailable = event => {if (event.data.size) chunks.push(event.data);};
        recorder.onerror = () => {cleanup();start.disabled=false;start.textContent='Rekodi sauti';onError('Rekodi haikuhifadhiwa.');};
        recorder.onstop = async () => {
          cleanup();
          const type = recorder.mimeType.split(';')[0];
          const ext = type === 'audio/mp4' ? 'm4a' : type.split('/')[1] || 'webm';
          start.disabled = true;
          start.textContent = 'Rekodi sauti';
          try {await onFile(new File(chunks, 'tangazo.' + ext, {type}));}
          catch (error) {onError(error.message);}
          finally {start.disabled = false;}
        };
        recorder.start(500);
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

  window.JamcoMedia = {upload, bindRecorder, meter, speak};
})();

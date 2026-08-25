const $ = (id) => document.getElementById(id);
const video = $('video');
const state = { markers: [], selectedId: null, history: [], file: null, objectUrl: null, project: null, duration: 0, dragging: false, ffmpeg: null, converting: false, compatiblePreview: false, frameCheck: null, frameRendered: false };
const els = Object.fromEntries(['empty-state','studio','video-input','project-input','open-project','new-video','video-name','video-meta','import-progress','import-status','import-percent','import-progress-bar','video-error','video-error-message','decode-progress','decode-progress-bar','decode-percent','convert-video','play-button','mark-button','current-time','duration','timeline-duration','timeline','timeline-progress','playhead','marker-layer','marker-count','precision-panel','selected-marker-name','selected-status','selected-time','selected-delta','previous-frame','next-frame','validate-marker','delete-marker','marker-label','volume','mute-button','end-session','export-txt','export-csv','export-json','toast'].map(id => [id, $(id)]));

const formatTime = (seconds = 0) => { const ms = Math.max(0, Math.round(seconds * 1000)); const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}.${String(ms % 1000).padStart(3,'0')}`; };
const selected = () => state.markers.find(m => m.id === state.selectedId);
const clamp = (value) => Math.max(0, Math.min(state.duration || 0, value));
function toast(message) { els.toast.textContent = message; els.toast.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => els.toast.classList.remove('visible'), 1000); }
function setImportProgress(message, percent = null) { els['import-progress'].hidden = false; els['import-status'].textContent = message; els['import-percent'].textContent = percent === null ? '—' : `${percent}%`; els['import-progress-bar'].style.width = percent === null ? '4%' : `${Math.max(4, percent)}%`; els['import-progress-bar'].style.animation = percent === null ? '' : 'none'; }
function clearImportProgress() { els['import-progress'].hidden = true; }
function setDecodeProgress(percent) { els['decode-progress'].hidden = false; els['decode-percent'].textContent = `${percent}%`; els['decode-progress-bar'].style.width = `${percent}%`; }
function snapshot() { state.history.push(JSON.stringify({ markers: state.markers, selectedId: state.selectedId })); if (state.history.length > 80) state.history.shift(); }
function save() { if (!state.project && !state.file) return; localStorage.setItem('ea-video-cue-studio', JSON.stringify({ schemaVersion:1, video:{ name:state.file?.name || state.project?.video?.filename || 'Unlinked video', duration:state.duration, size:state.file?.size || null }, markers:state.markers })); }
function render() {
  const duration = state.duration || 1, time = video.currentTime || 0;
  els['current-time'].textContent = formatTime(time); els.duration.textContent = formatTime(state.duration); els['timeline-duration'].textContent = formatTime(state.duration);
  const position = `${(time / duration) * 100}%`; els.playhead.style.left = position;
  els['timeline-progress'].style.width = position; els['marker-count'].textContent = `${state.markers.length} CUE${state.markers.length === 1 ? '' : 'S'}`;
  els['marker-layer'].replaceChildren(...state.markers.map((marker, index) => { const button = document.createElement('button'); button.className = `cue-marker ${marker.status}${marker.id === state.selectedId ? ' selected' : ''}`; button.style.left = `${marker.time / duration * 100}%`; button.dataset.number = String(index + 1).padStart(2,'0'); button.title = `Marker ${index + 1}: ${formatTime(marker.time)}`; button.setAttribute('aria-label', button.title); button.addEventListener('click', (event) => { event.stopPropagation(); select(marker.id); }); button.addEventListener('pointerdown', startDrag); return button; }));
  const marker = selected(); els['precision-panel'].hidden = !marker;
  if (marker) { const index = state.markers.indexOf(marker) + 1; els['selected-marker-name'].textContent = `MARKER ${String(index).padStart(2,'0')}`; els['selected-status'].textContent = marker.status.toUpperCase(); els['selected-time'].textContent = formatTime(marker.time); const delta = Math.round((marker.time - marker.originalTime) * 1000); els['selected-delta'].textContent = delta ? `Δ ${delta > 0 ? '+' : ''}${delta} MS` : 'ORIGINAL'; els['marker-label'].value = marker.label || ''; els['validate-marker'].textContent = marker.status === 'validated' ? 'UNVALIDATE' : 'VALIDATE'; }
}
function select(id) { state.selectedId = id; const marker = selected(); if (marker) { video.pause(); video.currentTime = marker.time; } render(); }
function addMarker() { if (!state.duration) return; snapshot(); const marker = { id: crypto.randomUUID(), time:video.currentTime, originalTime:video.currentTime, status:'raw', label:'' }; state.markers.push(marker); state.markers.sort((a,b) => a.time-b.time); state.selectedId = marker.id; save(); render(); toast('MARKER ADDED'); }
function moveSelected(time) { const marker = selected(); if (!marker) return; marker.time = clamp(time); video.currentTime = marker.time; state.markers.sort((a,b) => a.time-b.time); save(); render(); }
function startDrag(event) { event.preventDefault(); event.stopPropagation(); const id = state.markers[Array.from(els['marker-layer'].children).indexOf(event.currentTarget)]?.id; if (!id) return; select(id); snapshot(); state.dragging = true; event.currentTarget.setPointerCapture?.(event.pointerId); const move = (e) => moveSelected((e.clientX - els.timeline.getBoundingClientRect().left) / els.timeline.getBoundingClientRect().width * state.duration); const end = () => { state.dragging=false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); }
function download(name, content, type='text/plain;charset=utf-8') { const url = URL.createObjectURL(new Blob([content], {type})); const link=document.createElement('a'); link.href=url; link.download=name; link.click(); URL.revokeObjectURL(url); }
function exportProject() { return { schemaVersion:1, tool:'Electronic Artefacts Video Cue Studio', video:{ filename:state.file?.name || state.project?.video?.filename || 'Unlinked video', duration:state.duration }, markers:state.markers.map(({id,time,status,label})=>({id,time,status,label})) }; }
function resetVideo() { if(state.objectUrl) URL.revokeObjectURL(state.objectUrl); video.removeAttribute('src'); video.load(); state.objectUrl=null; state.file=null; }
function showVideoAssist(message, canConvert = true) { els['video-error-message'].textContent = message; els['convert-video'].hidden = !canConvert; els['video-error'].hidden = false; }
function loadVideo(file) { if (!file) return; resetVideo(); state.file=file; state.compatiblePreview=false; setImportProgress('OPENING LOCAL VIDEO'); els['video-error'].hidden=true; requestAnimationFrame(() => { state.objectUrl=URL.createObjectURL(file); video.src=state.objectUrl; video.load(); }); }
function setStudio() { els['empty-state'].hidden=true; els.studio.hidden=false; }
function monitorVideoFrames() {
  if (state.compatiblePreview || state.converting || !state.file) return;
  if (typeof video.requestVideoFrameCallback !== 'function') return;
  clearTimeout(state.frameCheck); state.frameRendered = false;
  video.requestVideoFrameCallback(() => { state.frameRendered = true; clearTimeout(state.frameCheck); });
  state.frameCheck = setTimeout(() => {
    if (state.frameRendered || state.compatiblePreview || state.converting) return;
    showVideoAssist('No video frame was produced by this browser decoder. Preparing a compatible local preview now — your original file remains on your device.', false);
    prepareForPlayback();
  }, 1800);
}
async function prepareForPlayback() {
  if (!state.file || state.converting) return;
  state.converting = true; video.pause(); els['convert-video'].hidden = true; setDecodeProgress(0);
  try {
    els['video-error-message'].textContent = 'Preparing a browser-compatible preview locally. The first use downloads the FFmpeg engine (about 31 MB); your video is never uploaded.';
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'),
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js')
    ]);
    if (!state.ffmpeg) {
      state.ffmpeg = new FFmpeg();
      state.ffmpeg.on('progress', ({ progress }) => { const percent = Math.round(progress * 100); els['video-error-message'].textContent = `Preparing preview locally: ${percent}%`; setDecodeProgress(percent); });
      const core = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
      await state.ffmpeg.load({ coreURL: await toBlobURL(`${core}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${core}/ffmpeg-core.wasm`, 'application/wasm') });
    }
    const extension = state.file.name.includes('.') ? state.file.name.slice(state.file.name.lastIndexOf('.')) : '.video';
    const input = `source${extension}`, output = 'browser-preview.mp4';
    await state.ffmpeg.writeFile(input, await fetchFile(state.file));
    await state.ffmpeg.exec(['-i', input, '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
    const data = await state.ffmpeg.readFile(output);
    await state.ffmpeg.deleteFile(input); await state.ffmpeg.deleteFile(output);
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.compatiblePreview = true; state.objectUrl = URL.createObjectURL(new Blob([data.buffer], { type:'video/mp4' }));
    els['decode-progress'].hidden = true; els['video-error'].hidden = true; video.src = state.objectUrl; video.load(); toast('LOCAL PREVIEW READY');
  } catch (error) {
    console.error(error); showVideoAssist('This file could not be prepared by the local browser engine. Try a smaller file or a browser-compatible H.264 MP4.', false);
  } finally { state.converting = false; }
}

els['video-input'].addEventListener('change', e => loadVideo(e.target.files[0])); els['new-video'].addEventListener('click',()=>els['video-input'].click()); els['open-project'].addEventListener('click',()=>els['project-input'].click());
els['project-input'].addEventListener('change', async e => { try { const project=JSON.parse(await e.target.files[0].text()); if(project.schemaVersion !== 1 || !Array.isArray(project.markers)) throw Error(); snapshot(); state.project=project; state.markers=project.markers.map(m=>({...m,originalTime:m.time,label:m.label || '',status:m.status === 'validated' ? 'validated':'raw'})); state.selectedId=null; state.duration=project.video?.duration || 0; setStudio(); els['video-name'].textContent=`${project.video?.filename || 'UNLINKED VIDEO'} — RELOAD ORIGINAL VIDEO`; els['video-meta'].textContent='Markers restored locally'; render(); toast('PROJECT OPENED'); } catch { toast('INVALID VIDEO CUE STUDIO JSON'); } });
video.addEventListener('progress', () => { if (els['import-progress'].hidden || !video.duration || !video.buffered.length) return; const end = video.buffered.end(video.buffered.length - 1); setImportProgress('BUFFERING LOCAL VIDEO', Math.min(99, Math.round(end / video.duration * 100))); });
video.addEventListener('loadedmetadata', () => { state.duration=video.duration; clearImportProgress(); setStudio(); els['video-name'].textContent=state.file?.name || state.project?.video?.filename || 'LOCAL VIDEO'; els['video-meta'].textContent=`${video.videoWidth || '—'} × ${video.videoHeight || '—'} · ${formatTime(video.duration)}`; if ((!video.videoWidth || !video.videoHeight) && !state.compatiblePreview) { showVideoAssist('Your browser can read the audio, but cannot render this video codec. Preparing a compatible local preview now.', false); prepareForPlayback(); } else els['video-error'].hidden=true; render(); save(); });
video.addEventListener('playing', monitorVideoFrames); video.addEventListener('error', () => { if (state.compatiblePreview) { showVideoAssist('The local preview could not be rendered by this browser. Try Chrome or Safari with the original video.', false); return; } showVideoAssist('This browser cannot decode this video directly. Preparing a compatible local preview now.', false); prepareForPlayback(); }); video.addEventListener('timeupdate',render); video.addEventListener('play',()=>els['play-button'].textContent='PAUSE'); video.addEventListener('pause',()=>els['play-button'].textContent='PLAY');
els['convert-video'].addEventListener('click', prepareForPlayback); els['play-button'].addEventListener('click',()=>video.paused?video.play():video.pause()); els['mark-button'].addEventListener('click',addMarker); els.timeline.addEventListener('click',e=>{ if(!state.dragging) video.currentTime=clamp((e.clientX-els.timeline.getBoundingClientRect().left)/els.timeline.getBoundingClientRect().width*state.duration); });
els['previous-frame'].addEventListener('click',()=>{snapshot();moveSelected(video.currentTime - 1/30)}); els['next-frame'].addEventListener('click',()=>{snapshot();moveSelected(video.currentTime + 1/30)});
els['validate-marker'].addEventListener('click',()=>{ const marker=selected(); if(!marker)return; snapshot(); marker.status=marker.status==='validated'?'raw':'validated';save();render(); }); els['delete-marker'].addEventListener('click',()=>{ if(!selected())return; snapshot(); state.markers=state.markers.filter(m=>m.id!==state.selectedId); state.selectedId=null;save();render();toast('MARKER DELETED'); });
els['marker-label'].addEventListener('change',()=>{const marker=selected();if(marker){snapshot();marker.label=els['marker-label'].value.trim();save();render();}}); els.volume.addEventListener('input',()=>video.volume=els.volume.value);els['mute-button'].addEventListener('click',()=>{video.muted=!video.muted;els['mute-button'].textContent=video.muted?'UNMUTE':'MUTE'});
els['end-session'].addEventListener('click',()=>{video.pause();toast('SESSION SAVED LOCALLY');}); els['export-txt'].addEventListener('click',()=>{const p=exportProject();download('video-cue-sheet.txt',`ELECTRONIC ARTEFACTS — VIDEO CUE STUDIO\nVideo: ${p.video.filename}\nDuration: ${formatTime(p.video.duration)}\n\n${p.markers.map((m,i)=>`${String(i+1).padStart(2,'0')}  ${formatTime(m.time)}${m.label?'  '+m.label:''}`).join('\n')}\n`)});els['export-csv'].addEventListener('click',()=>download('video-cues.csv',['id,time_seconds,timecode,status,label',...state.markers.map((m,i)=>`${i+1},${m.time.toFixed(3)},${formatTime(m.time)},${m.status},"${(m.label||'').replaceAll('"','""')}"`)].join('\n'),'text/csv;charset=utf-8'));els['export-json'].addEventListener('click',()=>download('video-cue-project.json',JSON.stringify(exportProject(),null,2),'application/json'));
window.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA'].includes(tag))return;if(e.code==='Space'){e.preventDefault();video.paused?video.play():video.pause()}if(e.key.toLowerCase()==='m')addMarker();if(e.key==='ArrowLeft'&&selected()){e.preventDefault();snapshot();moveSelected(video.currentTime-1/30)}if(e.key==='ArrowRight'&&selected()){e.preventDefault();snapshot();moveSelected(video.currentTime+1/30)}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();const old=state.history.pop();if(old){const data=JSON.parse(old);state.markers=data.markers;state.selectedId=data.selectedId;save();render();toast('UNDO');}}});
render();

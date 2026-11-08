const esbuild = require('esbuild');
const path = require('path');
const source = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaTimelineClock } from './src/utils/mediaTimeline';
import { MediaPublicationOrder } from './src/utils/mediaOrdering';
import { timelinePresentation } from './src/utils/timelinePresentation';
import { MOCK_MEDIA_STATE } from './src/types/media';
import { DEFAULT_THEME_CONFIG } from './src/types/themes';
import { ThemeRenderer } from './src/theme-sdk/ThemeRenderer';
import { STARTER_BUNDLES, bundleToThemeDefinition } from './src/theme-sdk/templates/starterBundles';
import { THEME_COMPONENTS } from './src/themes/ThemeRegistry';
import { BigStage } from './src/big-studio/BigStage';
const check = (value, message) => { if (!value) throw Error(message); };
const wall = 1800000000000;
const sample = (patch = {}) => ({...MOCK_MEDIA_STATE, position_ms:20000,duration_ms:600000,updated_at:wall,stream_id:'process-a',source_id:'browser-a',source_generation:1,sequence:1,playback_rate:1,playback_rate_known:true,timeline:{position_valid:true,duration_known:true,kind:'finite',origin:'estimated',advancing:true,observed_position_ms:20000,observed_at_ms:wall,received_at_ms:wall,uncertainty_ms:0,start_ms:0,end_ms:600000,min_seek_ms:0,max_seek_ms:600000},...patch});
for (const rate of [.5,1,1.5,2,4]) {
 const clock = new MediaTimelineClock();
 clock.ingest(sample({playback_rate:rate}),0,wall);
 check(clock.position(1000) === 20000+1000*rate,'rate-aware projection '+rate);
 check(!clock.ingest(sample(),1000,wall+1000),'duplicate IPC/WS packet must not reanchor');
 clock.ingest(sample({sequence:2,position_ms:20000+1000*rate,updated_at:wall+1000,playback_rate:rate}),1000,wall+1000);
 check(clock.position(2000) === 20000+2000*rate,'backend projection must not be extrapolated twice');
 clock.ingest(sample({sequence:3,status:'Paused',position_ms:20000+2000*rate,updated_at:wall+2000,playback_rate:rate,timeline:{...sample().timeline,advancing:false}}),2000,wall+2000);
 check(clock.position(12000)===20000+2000*rate,'pause freezes');
 clock.ingest(sample({sequence:4,position_ms:20000+2000*rate,updated_at:wall+12000,playback_rate:rate}),12000,wall+12000);
 check(clock.position(13000)===20000+3000*rate,'resume excludes pause interval');
 clock.ingest(sample({sequence:5,position_ms:3000,updated_at:wall+13000,playback_rate:rate}),13000,wall+13000);
 check(clock.position(13000)===3000,'backward seeks are authoritative');
 clock.ingest(sample({sequence:6,position_ms:120000,updated_at:wall+14000,playback_rate:rate}),14000,wall+14000);
 check(clock.position(14000)===120000,'forward seeks are authoritative');
}
const clock=new MediaTimelineClock();
for(let seconds=0;seconds<=300;seconds++) {
 clock.ingest(sample({sequence:seconds+1,position_ms:20000+seconds*1000,updated_at:wall+seconds*1000}),seconds*1000,wall+seconds*1000);
 check(clock.position(seconds*1000+500)===20500+seconds*1000,'five-minute periodic projection at '+seconds);
}
check(clock.position(600000)===335000,'lost backend feed must stop projecting after the freshness window');
clock.ingest(sample({sequence:303,source_generation:2,source_id:'browser-b',position_ms:1000,updated_at:wall+601000}),601000,wall+601000);
check(clock.position(601000)===1000,'same-title source switch resets the clock');
const bounded=new MediaTimelineClock();bounded.ingest(sample({position_ms:599000}),0,wall);check(bounded.position(10000)===600000 && !bounded.isAdvancingAt(10000),'finite end bound');
const smallSeek=new MediaTimelineClock();smallSeek.ingest(sample(),0,wall);smallSeek.ingest(sample({position_ms:20500,updated_at:wall+1000,sequence:2}),1000,wall+1000);check(smallSeek.position(1000)===20500,'small authoritative backward correction must not be blocked');
const zeroRate=new MediaTimelineClock();zeroRate.ingest(sample({playback_rate:0}),0,wall);check(zeroRate.position(5000)===20000,'zero rate freezes nominal Playing state');
const transport=new MediaTimelineClock();transport.ingest(sample({playback_rate:2}),0,wall+250);check(transport.position(0)===20500,'transport compensation uses actual rate once');
const unknown=sample({duration_ms:0,timeline:{...sample().timeline,duration_known:false,end_ms:null,max_seek_ms:null,kind:'unknown'}});
const elapsed=new MediaTimelineClock();elapsed.ingest(unknown,0,wall);check(elapsed.position(1000)===21000,'known elapsed must advance without duration');
check(timelinePresentation(unknown).label==='0:20' && !timelinePresentation(unknown).determinate,'elapsed-only presentation');
const unavailable={...unknown,position_ms:0,timeline:{...unknown.timeline,position_valid:false,origin:'unavailable',advancing:false}};
check(timelinePresentation(unavailable).label==='--:--' && !timelinePresentation(unavailable).determinate,'unavailable is not zero or LIVE');
const noPosition=new MediaTimelineClock();noPosition.ingest(unavailable,0,wall);check(noPosition.position(5000)===0,'no invented observed-since counter');
const order=new MediaPublicationOrder();
check(order.accept(sample()),'first publication');
check(!order.accept(sample()),'duplicate publication');
const oldRevision=order.revision;
check(order.accept(sample({sequence:5,source_generation:2,source_id:'browser-b'})),'same-title source change');
check(!order.accept(sample({sequence:4})),'out-of-order socket/native snapshot');
check(!order.accept(sample({sequence:6,source_generation:1})),'retired source generation');
check(order.accept(sample({stream_id:'process-b',sequence:1,source_generation:1,updated_at:wall-1000})),'process restart survives wall clock correction');
check(!order.accept(sample({sequence:10}),oldRevision),'late HTTP response cannot restore old process');
check(!order.accept(sample({sequence:11})),'retired process cannot return over another transport');
check(!order.accept({...MOCK_MEDIA_STATE,updated_at:wall+999999}),'legacy reply cannot replace versioned stream');
check(!order.accept({type:'layers_updated'} as any),'other socket payload is not media state');
const theme={schemaVersion:1,id:'timeline',name:'Timeline',elements:[{id:'progress',type:'progress',x:0,y:0,width:100,height:20,visible:true}]};
for(const media of [unknown,unavailable]) {
 const state=timelinePresentation(media).state;
 for(const surface of ['obs','tiktok','desktop','big']) {
  const html=renderToStaticMarkup(React.createElement(ThemeRenderer,{theme,surface,media,artUrl:'',config:DEFAULT_THEME_CONFIG}));
  check(html.includes('data-timeline-state="'+state+'"') && !html.includes('aria-valuenow='),'declarative unknown progress '+surface);
 }
 const big=renderToStaticMarkup(React.createElement(BigStage,{media,artUrl:'',config:DEFAULT_THEME_CONFIG}));
 check(big.includes(timelinePresentation(media).label) && !big.includes('aria-valuenow='),'Big Studio unknown semantics');
 for(const [id,Component] of Object.entries(THEME_COMPONENTS)) {
  const html=renderToStaticMarkup(React.createElement(Component,{media,artUrl:'',config:DEFAULT_THEME_CONFIG}));
  check(html.includes(timelinePresentation(media).label),id+' must show elapsed/unavailable time');
 }
 for(const bundle of STARTER_BUNDLES) {
  const html=renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:bundleToThemeDefinition(bundle),surface:'desktop',media,artUrl:''}));
  check(html.includes(timelinePresentation(media).current) && !html.includes('/ --:--'),'compiled unknown timestamps '+bundle.manifest.name);
 }
}
const probeBundle={schemaVersion:2,manifest:{schemaVersion:2,id:'probe',name:'Probe'},files:{'Theme.tsx':'export default function Theme(p){return <div data-theme-role="frame"><span>{p.media.position_ms}|{p.rawMedia.position_ms}|{p.timeline.state}|{p.formattedTime.current}|{p.formattedTime.duration}|{p.progress}</span></div>}'}};
const probe=renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:bundleToThemeDefinition(probeBundle),surface:'desktop',media:unknown,artUrl:''}));
check(probe.includes('20000|20000|elapsed|0:20|--:--|0'),'compiled SDK projected/raw/semantic props contract');
console.log('Shared timeline: rates, five-minute projection, transport ordering, pause/resume, seeks, recovery, source identity, bounds, unknown data and all renderer families OK');
`;
const result = esbuild.buildSync({stdin:{contents:source,resolveDir:path.resolve(__dirname,'..'),sourcefile:'media-timeline-test.ts',loader:'ts'},bundle:true,jsx:'automatic',loader:{'.css':'empty','.md':'text'},platform:'node',format:'cjs',write:false,packages:'external'});
new Function('require','module','exports',result.outputFiles[0].text)(require,{exports:{}},{});

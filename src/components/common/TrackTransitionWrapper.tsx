import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrackTransitionStyle, TransitionDirection, TransitionIntensity, ThemeConfig } from "../../types/themes";
export interface TrackTransitionWrapperProps { transitionKey: string; style?: TrackTransitionStyle; direction?: TransitionDirection; intensity?: TransitionIntensity; durationMs?: number; delayMs?: number; className?: string; children: React.ReactNode }
type NewStyle = "soft-fade" | "glide" | "iris" | "curtain" | "orbit" | "focus" | "ribbon" | "bounce";
export const TRACK_TRANSITION_OPTIONS: { id: NewStyle; label: string; description: string; badge: string }[] = [
 {id:"soft-fade",label:"Soft Fade",description:"A gentle crossfade between tracks",badge:"Subtle"},
 {id:"glide",label:"Glide",description:"Slides along your chosen direction",badge:"Motion"},
 {id:"iris",label:"Iris Reveal",description:"Opens through an expanding circle",badge:"Reveal"},
 {id:"curtain",label:"Curtain",description:"A directional edge-to-edge wipe",badge:"Wipe"},
 {id:"orbit",label:"Orbit",description:"A short rotation through depth",badge:"3D"},
 {id:"focus",label:"Focus Pull",description:"Comes into focus from a soft blur",badge:"Focus"},
 {id:"ribbon",label:"Ribbon",description:"Unfolds from a narrow band",badge:"Fold"},
 {id:"bounce",label:"Bounce In",description:"A lively, controlled overshoot",badge:"Playful"},
];
export const TRACK_TRANSITION_DIRECTIONS: {id:TransitionDirection;label:string;symbol:string}[] = [
 {id:"left",label:"Left",symbol:"←"},{id:"up",label:"Up",symbol:"↑"},{id:"center",label:"Center",symbol:"•"},{id:"down",label:"Down",symbol:"↓"},{id:"right",label:"Right",symbol:"→"}];
export const TRACK_TRANSITION_INTENSITIES: {id:TransitionIntensity;label:string;color:string;desc:string}[] = [
 {id:"subtle",label:"Subtle",color:"#10b981",desc:"Clean & minimal"},{id:"standard",label:"Standard",color:"#3b82f6",desc:"Broadcast balanced"},{id:"dramatic",label:"Dramatic",color:"#8b5cf6",desc:"More motion"},{id:"extreme",label:"Extreme",color:"#ec4899",desc:"Maximum motion"}];
// Map saved pre-5.3 styles without discarding their direction, intensity, or timing.
const LEGACY_STYLES: Record<string,NewStyle> = {
 fade:"soft-fade",dissolve:"soft-fade","neon-flash":"soft-fade",push:"glide","card-swap":"glide","elastic-slide":"glide","slide-left":"glide","slide-right":"glide","slide-up":"glide","slide-down":"glide","hyperdrive-streak":"glide",
 "zoom-blur":"focus","zoom-depth":"focus","pixel-disintegrate":"focus","anamorphic-flare":"focus",flip:"orbit","flip-3d":"orbit",cube:"orbit","cube-rotate":"orbit","vinyl-spin":"orbit","disc-spin":"orbit",
 "origami-fold":"ribbon","prism-shatter":"ribbon","shutter-wipe":"curtain","neon-portal":"iris","black-hole":"iris","liquid-morph":"iris",glitch:"curtain","glitch-cyber":"curtain","hologram-scan":"curtain","vhs-rewind":"curtain","scale-pop":"bounce"};
export function normalizeTransitionConfig(config?:Partial<ThemeConfig>): {style:NewStyle;direction:TransitionDirection;intensity:TransitionIntensity} {
 const raw=config?.transitionStyle || "focus";
 const style=TRACK_TRANSITION_OPTIONS.find(option=>option.id===raw)?.id || LEGACY_STYLES[raw] || "focus";
 const legacyDirection:Partial<Record<string,TransitionDirection>>={"slide-left":"left","slide-right":"right","slide-up":"up","slide-down":"down"};
 return {style,direction:config?.transitionDirection || legacyDirection[raw] || "left",intensity:config?.transitionIntensity || "standard"};
}
export function transitionVariants(style:NewStyle,direction:TransitionDirection,intensity:TransitionIntensity) {
 const power={subtle:0.45,standard:1,dramatic:1.5,extreme:2}[intensity];
 const dx=direction==="left"?-1:direction==="right"?1:0, dy=direction==="up"?-1:direction==="down"?1:0, center=direction==="center";
 const origin=center?"center":direction;
 switch(style) {
 case "soft-fade": return {initial:{opacity:0},animate:{opacity:1},exit:{opacity:0}};
 case "glide": return {initial:{opacity:0,x:dx*70*power,y:dy*70*power,scale:center?0.92:1},animate:{opacity:1,x:0,y:0,scale:1},exit:{opacity:0,x:-dx*70*power,y:-dy*70*power,scale:center?0.92:1}};
 case "iris": return {initial:{opacity:0,clipPath:"circle(0% at 50% 50%)"},animate:{opacity:1,clipPath:"circle(150% at 50% 50%)"},exit:{opacity:0,clipPath:"circle(0% at 50% 50%)"}};
 case "curtain": {const closed=direction==="right"?"inset(0 0 0 100%)":direction==="up"?"inset(100% 0 0 0)":direction==="down"?"inset(0 0 100% 0)":center?"inset(0 50% 0 50%)":"inset(0 100% 0 0)"; return {initial:{opacity:0.2,clipPath:closed},animate:{opacity:1,clipPath:"inset(0 0 0 0)"},exit:{opacity:0,clipPath:closed}};}
 case "orbit": return {initial:{opacity:0,rotateY:(dx||(center?1:0))*55*power,rotateX:dy*-55*power,scale:0.9},animate:{opacity:1,rotateY:0,rotateX:0,scale:1},exit:{opacity:0,rotateY:-(dx||(center?1:0))*55*power,rotateX:dy*55*power,scale:0.9}};
 case "focus": return {initial:{opacity:0,filter:"blur("+(8*power)+"px)",scale:1+0.08*power},animate:{opacity:1,filter:"blur(0px)",scale:1},exit:{opacity:0,filter:"blur("+(8*power)+"px)",scale:1-0.06*power}};
 case "ribbon": return {initial:{opacity:0,scaleX:dy?1:0.05,scaleY:dy?0.05:1,transformOrigin:origin},animate:{opacity:1,scaleX:1,scaleY:1,transformOrigin:origin},exit:{opacity:0,scaleX:dy?1:0.05,scaleY:dy?0.05:1,transformOrigin:origin}};
 case "bounce": return {initial:{opacity:0,scale:1-0.3*power},animate:{opacity:1,scale:[1-0.3*power,1+0.06*power,1]},exit:{opacity:0,scale:1-0.2*power}};
 }
}
export const TrackTransitionWrapper:React.FC<TrackTransitionWrapperProps> = ({transitionKey,style,direction,intensity,durationMs=350,delayMs=0,className="",children}) => {
 const normalized=normalizeTransitionConfig({transitionStyle:style,transitionDirection:direction,transitionIntensity:intensity});
 const variants=transitionVariants(normalized.style,normalized.direction,normalized.intensity);
 // Remove temporary compositing effects after entry so idle glass can sample
 // the backdrop and the curtain/iris cannot leave a rectangular shadow clip.
 const idleEffects: { clipPath?: string; filter?: string } = normalized.style === "focus" ? {filter:"none"} : normalized.style === "curtain" || normalized.style === "iris" ? {clipPath:"none"} : {};
 const duration=Number.isFinite(durationMs)?Math.max(0,durationMs)/1000:0.35, delay=Number.isFinite(delayMs)?Math.max(0,delayMs)/1000:0;
 return <div className="track-transition-wrapper" style={{position:"relative",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",perspective:1400}}>
 <AnimatePresence mode="popLayout" initial={false}><motion.div key={transitionKey} initial={variants.initial} animate={{...variants.animate,transitionEnd:idleEffects}} exit={variants.exit} transition={{duration,delay,ease:[0.22,1,0.36,1]}} className={"track-transition-inner "+className} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",transformStyle:"preserve-3d"}}>{children}</motion.div></AnimatePresence></div>;
};

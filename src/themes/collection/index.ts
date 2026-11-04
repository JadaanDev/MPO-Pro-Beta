import React from "react";
import { ThemeId, ThemeMeta, ThemeProps } from "../../types/themes";
import { Theme as ObsSignalDesk, meta as ObsSignalDeskMeta } from "./obs-signal-desk";
import { Theme as ObsOnAir, meta as ObsOnAirMeta } from "./obs-on-air";
import { Theme as ObsEditorial, meta as ObsEditorialMeta } from "./obs-editorial";
import { Theme as ObsCircuit, meta as ObsCircuitMeta } from "./obs-circuit";
import { Theme as ObsTapeRoom, meta as ObsTapeRoomMeta } from "./obs-tape-room";
import { Theme as ObsLowerThird, meta as ObsLowerThirdMeta } from "./obs-lower-third";
import { Theme as ObsSpotlight, meta as ObsSpotlightMeta } from "./obs-spotlight";
import { Theme as ObsMonoFrame, meta as ObsMonoFrameMeta } from "./obs-mono-frame";
import { Theme as ObsMarquee, meta as ObsMarqueeMeta } from "./obs-marquee";
import { Theme as ObsSpectrum, meta as ObsSpectrumMeta } from "./obs-spectrum";
import { Theme as TiktokAurora, meta as TiktokAuroraMeta } from "./tiktok-aurora";
import { Theme as TiktokCoverStory, meta as TiktokCoverStoryMeta } from "./tiktok-cover-story";
import { Theme as TiktokNeonStory, meta as TiktokNeonStoryMeta } from "./tiktok-neon-story";
import { Theme as TiktokPostcard, meta as TiktokPostcardMeta } from "./tiktok-postcard";
import { Theme as TiktokSpotlight, meta as TiktokSpotlightMeta } from "./tiktok-spotlight";
import { Theme as TiktokSplitNote, meta as TiktokSplitNoteMeta } from "./tiktok-split-note";
import { Theme as TiktokTicket, meta as TiktokTicketMeta } from "./tiktok-ticket";
import { Theme as TiktokMinimal, meta as TiktokMinimalMeta } from "./tiktok-minimal";
import { Theme as TiktokPrism, meta as TiktokPrismMeta } from "./tiktok-prism";
import { Theme as TiktokPlayer, meta as TiktokPlayerMeta } from "./tiktok-player";
import { Theme as DesktopAir, meta as DesktopAirMeta } from "./desktop-air";
import { Theme as DesktopIsland, meta as DesktopIslandMeta } from "./desktop-island";
import { Theme as DesktopMeter, meta as DesktopMeterMeta } from "./desktop-meter";
import { Theme as DesktopSlate, meta as DesktopSlateMeta } from "./desktop-slate";
import { Theme as DesktopRecord, meta as DesktopRecordMeta } from "./desktop-record";
import { Theme as DesktopFrost, meta as DesktopFrostMeta } from "./desktop-frost";
import { Theme as DesktopEdge, meta as DesktopEdgeMeta } from "./desktop-edge";
import { Theme as DesktopFocus, meta as DesktopFocusMeta } from "./desktop-focus";
import { Theme as DesktopPrism, meta as DesktopPrismMeta } from "./desktop-prism";
import { Theme as DesktopDesk, meta as DesktopDeskMeta } from "./desktop-desk";

export const COLLECTION_META: Partial<Record<ThemeId, ThemeMeta>> = {
  "obs-signal-desk": ObsSignalDeskMeta,
  "obs-on-air": ObsOnAirMeta,
  "obs-editorial": ObsEditorialMeta,
  "obs-circuit": ObsCircuitMeta,
  "obs-tape-room": ObsTapeRoomMeta,
  "obs-lower-third": ObsLowerThirdMeta,
  "obs-spotlight": ObsSpotlightMeta,
  "obs-mono-frame": ObsMonoFrameMeta,
  "obs-marquee": ObsMarqueeMeta,
  "obs-spectrum": ObsSpectrumMeta,
  "tiktok-aurora": TiktokAuroraMeta,
  "tiktok-cover-story": TiktokCoverStoryMeta,
  "tiktok-neon-story": TiktokNeonStoryMeta,
  "tiktok-postcard": TiktokPostcardMeta,
  "tiktok-spotlight": TiktokSpotlightMeta,
  "tiktok-split-note": TiktokSplitNoteMeta,
  "tiktok-ticket": TiktokTicketMeta,
  "tiktok-minimal": TiktokMinimalMeta,
  "tiktok-prism": TiktokPrismMeta,
  "tiktok-player": TiktokPlayerMeta,
  "desktop-air": DesktopAirMeta,
  "desktop-island": DesktopIslandMeta,
  "desktop-meter": DesktopMeterMeta,
  "desktop-slate": DesktopSlateMeta,
  "desktop-record": DesktopRecordMeta,
  "desktop-frost": DesktopFrostMeta,
  "desktop-edge": DesktopEdgeMeta,
  "desktop-focus": DesktopFocusMeta,
  "desktop-prism": DesktopPrismMeta,
  "desktop-desk": DesktopDeskMeta,
};
export const COLLECTION_COMPONENTS: Partial<Record<ThemeId, React.FC<ThemeProps>>> = {
  "obs-signal-desk": ObsSignalDesk,
  "obs-on-air": ObsOnAir,
  "obs-editorial": ObsEditorial,
  "obs-circuit": ObsCircuit,
  "obs-tape-room": ObsTapeRoom,
  "obs-lower-third": ObsLowerThird,
  "obs-spotlight": ObsSpotlight,
  "obs-mono-frame": ObsMonoFrame,
  "obs-marquee": ObsMarquee,
  "obs-spectrum": ObsSpectrum,
  "tiktok-aurora": TiktokAurora,
  "tiktok-cover-story": TiktokCoverStory,
  "tiktok-neon-story": TiktokNeonStory,
  "tiktok-postcard": TiktokPostcard,
  "tiktok-spotlight": TiktokSpotlight,
  "tiktok-split-note": TiktokSplitNote,
  "tiktok-ticket": TiktokTicket,
  "tiktok-minimal": TiktokMinimal,
  "tiktok-prism": TiktokPrism,
  "tiktok-player": TiktokPlayer,
  "desktop-air": DesktopAir,
  "desktop-island": DesktopIsland,
  "desktop-meter": DesktopMeter,
  "desktop-slate": DesktopSlate,
  "desktop-record": DesktopRecord,
  "desktop-frost": DesktopFrost,
  "desktop-edge": DesktopEdge,
  "desktop-focus": DesktopFocus,
  "desktop-prism": DesktopPrism,
  "desktop-desk": DesktopDesk,
};

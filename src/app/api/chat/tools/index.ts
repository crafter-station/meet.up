import { suggestFollowups } from "./suggest-followups";
import { webSearch } from "./web-search";

export { getCurrentMeetingCodeTool } from "./get-current-meeting-code";
export { getCurrentTimeTool } from "./get-current-time";
export { getMeetingParticipantEmailsTool } from "./get-meeting-participant-emails";
export { googleCalendarTools } from "./google-calendar";
export { scheduleMeetingTool } from "./schedule-meeting";

export function tools() {
  return {
    webSearch,
    suggestFollowups,
  };
}

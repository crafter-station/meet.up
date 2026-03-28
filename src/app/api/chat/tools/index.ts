import { suggestFollowups } from "./suggest-followups";
import { webSearch } from "./web-search";

export function tools() {
  return {
    webSearch,
    suggestFollowups,
  };
}

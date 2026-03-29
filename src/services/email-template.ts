import type { MeetingSummary } from "./summary-service";

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function listItems(items: string[]): string {
	if (items.length === 0) return "<p style=\"color:#888;\">None identified</p>";
	return `<ul style="margin:0;padding-left:20px;">${items.map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function buildInvitationEmail(params: {
	organizerName: string;
	title: string;
	description?: string;
	scheduledAt: Date;
	meetingUrl: string;
	roomCode: string;
}): string {
	const {
		organizerName,
		title,
		description,
		scheduledAt,
		meetingUrl,
		roomCode,
	} = params;

	const formattedDate = scheduledAt.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	const formattedTime = scheduledAt.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#fff;border-radius:10px;padding:10px 14px;margin-bottom:12px;">
          <span style="font-size:18px;font-weight:700;color:#000;">meet.up</span>
        </div>
        <h1 style="color:#fafafa;font-size:22px;margin:8px 0 4px;">You&rsquo;re invited</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0;">${escapeHtml(organizerName)} invited you to a meeting</p>
      </div>

      <!-- Meeting details -->
      <div style="margin-bottom:24px;">
        <h2 style="color:#fafafa;font-size:18px;margin:0 0 8px;">${escapeHtml(title)}</h2>
        ${description ? `<p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin:0 0 12px;">${escapeHtml(description)}</p>` : ""}
        <p style="color:#a1a1aa;font-size:14px;margin:0;">${escapeHtml(formattedDate)} at ${escapeHtml(formattedTime)}</p>
      </div>

      <!-- Room code -->
      <div style="margin-bottom:24px;background:#27272a;border-radius:8px;padding:16px;text-align:center;">
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Room code</p>
        <p style="color:#fafafa;font-size:18px;font-weight:600;margin:0;letter-spacing:0.05em;">${escapeHtml(roomCode)}</p>
      </div>

      <!-- CTA button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${escapeHtml(meetingUrl)}" style="display:inline-block;background:#fff;color:#000;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Join meeting
        </a>
      </div>

      <!-- Footer -->
      <div style="text-align:center;border-top:1px solid #27272a;padding-top:16px;">
        <p style="color:#71717a;font-size:12px;margin:0;">Sent via meet.up</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildSummaryEmail(
	summary: MeetingSummary,
	roomName: string,
	date: Date,
): string {
	const formattedDate = date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#fff;border-radius:10px;padding:10px 14px;margin-bottom:12px;">
          <span style="font-size:18px;font-weight:700;color:#000;">meet.up</span>
        </div>
        <h1 style="color:#fafafa;font-size:22px;margin:8px 0 4px;">${escapeHtml(summary.title)}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0;">${escapeHtml(roomName)} &middot; ${escapeHtml(formattedDate)}</p>
      </div>

      <!-- Summary -->
      <div style="margin-bottom:24px;">
        <h2 style="color:#fafafa;font-size:15px;margin:0 0 8px;border-bottom:1px solid #27272a;padding-bottom:6px;">Summary</h2>
        <p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(summary.summary)}</p>
      </div>

      <!-- Key Topics -->
      <div style="margin-bottom:24px;">
        <h2 style="color:#fafafa;font-size:15px;margin:0 0 8px;border-bottom:1px solid #27272a;padding-bottom:6px;">Key Topics</h2>
        <div style="color:#d4d4d8;font-size:14px;line-height:1.6;">${listItems(summary.keyTopics)}</div>
      </div>

      <!-- Action Items -->
      <div style="margin-bottom:24px;">
        <h2 style="color:#fafafa;font-size:15px;margin:0 0 8px;border-bottom:1px solid #27272a;padding-bottom:6px;">Action Items</h2>
        <div style="color:#d4d4d8;font-size:14px;line-height:1.6;">${listItems(summary.actionItems)}</div>
      </div>

      <!-- Decisions -->
      <div style="margin-bottom:24px;">
        <h2 style="color:#fafafa;font-size:15px;margin:0 0 8px;border-bottom:1px solid #27272a;padding-bottom:6px;">Decisions</h2>
        <div style="color:#d4d4d8;font-size:14px;line-height:1.6;">${listItems(summary.decisions)}</div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;border-top:1px solid #27272a;padding-top:16px;">
        <p style="color:#71717a;font-size:12px;margin:0;">Generated by meet.up</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
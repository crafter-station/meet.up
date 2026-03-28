import { tool } from "ai";
import { google } from "googleapis";
import { z } from "zod";

function getCalendarClient(accessToken: string) {
	const auth = new google.auth.OAuth2();
	auth.setCredentials({ access_token: accessToken });
	return google.calendar({ version: "v3", auth });
}

export function googleCalendarTools(accessToken: string) {
	const calendar = getCalendarClient(accessToken);

	const listCalendarEvents = tool({
		description:
			"List events from the user's Google Calendar within a date range. Use this when the user asks about upcoming meetings, schedule, or wants to see their calendar.",
		inputSchema: z.object({
			timeMin: z
				.string()
				.optional()
				.describe(
					"Start of date range in ISO 8601 format. Defaults to now.",
				),
			timeMax: z
				.string()
				.optional()
				.describe(
					"End of date range in ISO 8601 format. Defaults to 7 days from now.",
				),
			maxResults: z
				.number()
				.min(1)
				.max(50)
				.optional()
				.describe("Maximum number of events to return (default 10)"),
			calendarId: z
				.string()
				.optional()
				.describe("Calendar ID to query. Defaults to 'primary'."),
		}),
		execute: async ({
			timeMin,
			timeMax,
			maxResults = 10,
			calendarId = "primary",
		}) => {
			try {
				const now = new Date();
				const res = await calendar.events.list({
					calendarId,
					timeMin: timeMin ?? now.toISOString(),
					timeMax:
						timeMax ??
						new Date(
							now.getTime() + 7 * 24 * 60 * 60 * 1000,
						).toISOString(),
					maxResults,
					singleEvents: true,
					orderBy: "startTime",
				});

				const events =
					res.data.items?.map((e) => ({
						id: e.id,
						summary: e.summary,
						start: e.start?.dateTime ?? e.start?.date,
						end: e.end?.dateTime ?? e.end?.date,
						location: e.location,
						description: e.description,
						attendees: e.attendees?.map((a) => ({
							email: a.email,
							responseStatus: a.responseStatus,
						})),
						htmlLink: e.htmlLink,
					})) ?? [];

				return JSON.stringify(events);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to list events: ${message}`,
				});
			}
		},
	});

	const createCalendarEvent = tool({
		description:
			"Create a new event on the user's Google Calendar. Use this when the user wants to schedule a meeting, set a reminder, or book time.",
		inputSchema: z.object({
			summary: z.string().describe("Title of the event"),
			description: z
				.string()
				.optional()
				.describe("Description or notes for the event"),
			startDateTime: z
				.string()
				.describe(
					"Start time in ISO 8601 format (e.g. 2025-01-15T14:00:00-05:00)",
				),
			endDateTime: z
				.string()
				.describe(
					"End time in ISO 8601 format (e.g. 2025-01-15T15:00:00-05:00)",
				),
			timeZone: z
				.string()
				.optional()
				.describe(
					"IANA time zone (e.g. America/New_York). Defaults to UTC.",
				),
			location: z
				.string()
				.optional()
				.describe("Location of the event"),
			attendees: z
				.array(z.string().email())
				.optional()
				.describe("List of attendee email addresses"),
		}),
		execute: async ({
			summary,
			description,
			startDateTime,
			endDateTime,
			timeZone = "UTC",
			location,
			attendees,
		}) => {
			try {
				const res = await calendar.events.insert({
					calendarId: "primary",
					requestBody: {
						summary,
						description,
						start: { dateTime: startDateTime, timeZone },
						end: { dateTime: endDateTime, timeZone },
						location,
						attendees: attendees?.map((email) => ({ email })),
					},
				});

				return JSON.stringify({
					id: res.data.id,
					summary: res.data.summary,
					start: res.data.start?.dateTime ?? res.data.start?.date,
					end: res.data.end?.dateTime ?? res.data.end?.date,
					htmlLink: res.data.htmlLink,
					attendees: res.data.attendees?.map((a) => ({
						email: a.email,
						responseStatus: a.responseStatus,
					})),
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to create event: ${message}`,
				});
			}
		},
	});

	const updateCalendarEvent = tool({
		description:
			"Update an existing event on the user's Google Calendar. Use this when the user wants to change the time, title, description, or attendees of an existing event.",
		inputSchema: z.object({
			eventId: z.string().describe("The ID of the event to update"),
			summary: z
				.string()
				.optional()
				.describe("New title for the event"),
			description: z
				.string()
				.optional()
				.describe("New description for the event"),
			startDateTime: z
				.string()
				.optional()
				.describe("New start time in ISO 8601 format"),
			endDateTime: z
				.string()
				.optional()
				.describe("New end time in ISO 8601 format"),
			timeZone: z.string().optional().describe("IANA time zone"),
			location: z.string().optional().describe("New location"),
			attendees: z
				.array(z.string().email())
				.optional()
				.describe("Updated list of attendee email addresses"),
			calendarId: z
				.string()
				.optional()
				.describe("Calendar ID. Defaults to 'primary'."),
		}),
		execute: async ({
			eventId,
			summary,
			description,
			startDateTime,
			endDateTime,
			timeZone,
			location,
			attendees,
			calendarId = "primary",
		}) => {
			try {
				const requestBody: Record<string, unknown> = {};
				if (summary) requestBody.summary = summary;
				if (description) requestBody.description = description;
				if (location) requestBody.location = location;
				if (startDateTime)
					requestBody.start = { dateTime: startDateTime, timeZone };
				if (endDateTime)
					requestBody.end = { dateTime: endDateTime, timeZone };
				if (attendees)
					requestBody.attendees = attendees.map((email) => ({
						email,
					}));

				const res = await calendar.events.patch({
					calendarId,
					eventId,
					requestBody,
				});

				return JSON.stringify({
					id: res.data.id,
					summary: res.data.summary,
					start: res.data.start?.dateTime ?? res.data.start?.date,
					end: res.data.end?.dateTime ?? res.data.end?.date,
					htmlLink: res.data.htmlLink,
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to update event: ${message}`,
				});
			}
		},
	});

	const deleteCalendarEvent = tool({
		description:
			"Delete an event from the user's Google Calendar. Use this when the user wants to cancel or remove a meeting.",
		inputSchema: z.object({
			eventId: z.string().describe("The ID of the event to delete"),
			calendarId: z
				.string()
				.optional()
				.describe("Calendar ID. Defaults to 'primary'."),
		}),
		execute: async ({ eventId, calendarId = "primary" }) => {
			try {
				await calendar.events.delete({ calendarId, eventId });
				return JSON.stringify({ deleted: true, eventId });
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to delete event: ${message}`,
				});
			}
		},
	});

	const searchCalendarEvents = tool({
		description:
			"Search for events on the user's Google Calendar by keyword. Use this when the user asks about a specific meeting by name or topic.",
		inputSchema: z.object({
			query: z
				.string()
				.describe(
					"Search query to match against event titles, descriptions, and locations",
				),
			timeMin: z
				.string()
				.optional()
				.describe(
					"Start of date range in ISO 8601 format. Defaults to 30 days ago.",
				),
			timeMax: z
				.string()
				.optional()
				.describe(
					"End of date range in ISO 8601 format. Defaults to 30 days from now.",
				),
			maxResults: z
				.number()
				.min(1)
				.max(50)
				.optional()
				.describe("Maximum number of results (default 10)"),
		}),
		execute: async ({ query, timeMin, timeMax, maxResults = 10 }) => {
			try {
				const now = new Date();
				const thirtyDays = 30 * 24 * 60 * 60 * 1000;

				const res = await calendar.events.list({
					calendarId: "primary",
					q: query,
					timeMin:
						timeMin ??
						new Date(now.getTime() - thirtyDays).toISOString(),
					timeMax:
						timeMax ??
						new Date(now.getTime() + thirtyDays).toISOString(),
					maxResults,
					singleEvents: true,
					orderBy: "startTime",
				});

				const events =
					res.data.items?.map((e) => ({
						id: e.id,
						summary: e.summary,
						start: e.start?.dateTime ?? e.start?.date,
						end: e.end?.dateTime ?? e.end?.date,
						location: e.location,
						description: e.description,
						attendees: e.attendees?.map((a) => ({
							email: a.email,
							responseStatus: a.responseStatus,
						})),
						htmlLink: e.htmlLink,
					})) ?? [];

				return JSON.stringify(events);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to search events: ${message}`,
				});
			}
		},
	});

	return {
		listCalendarEvents,
		createCalendarEvent,
		updateCalendarEvent,
		deleteCalendarEvent,
		searchCalendarEvents,
	};
}
